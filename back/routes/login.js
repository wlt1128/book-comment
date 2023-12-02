var express = require('express');
var path = require('path');
var router = express.Router();
const R = require('../utils/resp');
const {exec, exec2} = require('../utils/mysql.utils');
const e = require("express");
const {loginCache, ordinaryCache} = require("../utils/cache.utils");
const {v4: uuidv4} = require('uuid');
const dayjs = require('dayjs')
const multer = require('multer');
// 配置 multer 存储引擎
const storage = multer.diskStorage({
    destination: './uploads', filename: function (req, file, callback) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extname = path.extname(file.originalname); // 获取文件扩展名
        callback(null, file.fieldname + '-' + uniqueSuffix + extname);
    }
});

const upload = multer({storage});

router.post('/login', function (req, res, next) {
    let data = req.body;
    exec(`select *
          from sys_user
          where name = '${data.username}'
            and password = '${data.password}'
            and role = 'admin'`).then((data) => {
        if (data.length > 0) {
            const id = uuidv4()
            loginCache.set(id, data[0].name)
            res.cookie('token', id, {maxAge: 1000 * 60 * 60})
            res.json(R.ok(data = null, msg = "login success!"))
        } else {
            res.json(R.LoginFail())
        }
    }).catch((err) => {
        res.json(R.LoginFail(err))
    })
});
router.get('/logout', function (req, res) {
    const token = req.cookies.token
    if (token && loginCache.get(token)) {
        loginCache.del(token)
        res.cookie('token', "", {maxAge: 0})
        res.json(R.ok(data = null, msg = "logout success!"))
    } else {
        res.status(401)
        res.json(R.notLogin())
    }
})

router.get('/isLogin', function (req, res) {
    const token = req.cookies.token
    if (token && loginCache.get(token)) {
        res.json(R.ok(data = null, msg = "success"))
    } else {
        res.status(401)
        res.json(R.notLogin())
    }
})
router.post('/save_book', upload.single('file'), function (req, res) {
    const file = req.file;
    const data = req.query
    const file_path = file?.path?.replace("\\", "/") ?? ""
    const sql = `insert into books (book_name, book_author, book_desc, book_image)
                 values ('${data.book_name}', '${data.author}', '${data.description}', '${file_path}')`

    exec(sql).then((data) => {
        res.json(R.ok(data = null, msg = "success"))
    }).catch((err) => {
        res.json(R.error("upload error!"))
    })
})
router.post('/edit_book', upload.single('file'), function (req, res) {
    const file = req.file;
    const data = req.query
    const file_path = file?.path?.replace("\\", "/") ?? ""
    const sql = `update books
                 set book_name   = '${data.book_name}',
                     book_author = '${data.author}',
                     book_desc   = '${data.description}'` + (file_path ? `, book_image = '${file_path}'` : "") + `where id = ${data.id}`
    console.log(sql)
    exec(sql).then((data) => {
        res.json(R.ok(data = null, msg = "success"))
    }).catch((err) => {
        res.json(R.error("edit error!"))
    })
})
router.get('/book/list', async function (req, res) {
    const query = req.query
    const page = query.page ?? 1
    const size = query.limit ?? 10
    const book_name = query.book_name ?? ""
    const book_author = query.book_author ?? ""
    let s_sql = ""
    if (book_name) {
        s_sql += ` and book_name like '%${book_name}%'`
    }
    if (book_author) {
        s_sql += ` and book_author like '%${book_author}%'`
    }
    const sql = `select *
                 from books
                 where 1 = 1` + s_sql + " limit " + (page - 1) * size + "," + size
    let total = await exec("select count(*) as total from books where 1=1" + s_sql)
    exec(sql).then((data) => {
        res.json(R.ok({total: total[0].total, list: data}, msg = "success"))
    }).catch((err) => {
        res.json(R.error())
    })
})
router.delete('/book/delete', async function (req, res) {
    const query = req.query
    const ids = query.book_id
    const sql = `delete
                 from books
                 where id in (${ids})`
    exec(sql).then((data) => {
        res.json(R.ok(data = null, msg = "success"))
    }).catch((err) => {
        res.json(R.error())
    })
})

router.get('/book/get_book', async function (req, res) {
    const query = req.query
    const page = query.page ?? 1
    const size = 15
    const search = query.search ?? ""

    let s_sql = ""
    if (search) {
        s_sql += ` and (book_name like '%${search}%' or book_author like '%${search}%')`
    }
    const sql = `select *
                 from books
                 where 1 = 1` + s_sql + " limit " + (page - 1) * size + "," + size
    let total = await exec("select count(*) as total from books where 1=1" + s_sql)
    exec(sql).then((data) => {
        res.json(R.ok({total: total[0].total, list: data}, msg = "success"))
    }).catch((err) => {
        res.json(R.error())
    })
})
router.get('/book/get', async function (req, res) {
    const query = req.query
    const bookId = query.book_id

    const sql = `select *
                 from books
                 where id = ${bookId}`
    let token = req.cookies["o-token"]
    const username = ordinaryCache.get(token ?? "")
    let is_like = false
    if (username) {
        let like_sql = `select *
                        from like_books
                        where book_id = ${bookId}
                          and username = '${username}'`
        let like_data = await exec(like_sql)
        is_like = like_data.length > 0
    }
    exec(sql).then((data) => {
        res.json(R.ok({data, is_like}, msg = "success"))
    }).catch((err) => {
        res.json(R.error())
    })
})

router.post('/ordinary/login', async function (req, res, next) {
    let data = req.body;
    let result = await exec(`select *
                             from sys_user
                             where name = '${data.username}'
                               and password = '${data.password}'
                               and role = 'ordinary'`)

    if (result?.length > 0) {
        const id = uuidv4()
        ordinaryCache.set(id, result[0].name)
        res.cookie('o-token', id, {maxAge: 1000 * 60 * 60})
        res.cookie("username", result[0].name, {maxAge: 1000 * 60 * 60})
        res.json(R.ok(data = null, msg = "login success!"))
    } else {
        result = await exec(`select *
                             from sys_user
                             where name = '${data.username}'`)
        if (result?.length > 0) {
            res.json(R.error("password error!"))
        } else {
            await exec(`insert into sys_user (name, password, role)
                        values ('${data.username}', '${data.password}', 'ordinary')`)
            const id = uuidv4()
            ordinaryCache.set(id, data.username)
            res.cookie('o-token', id, {maxAge: 1000 * 60 * 60})
            res.cookie("username", data.username, {maxAge: 1000 * 60 * 60})
            res.json(R.ok(data = null, msg = "login success!"))
        }
    }
});

router.post('/ordinary/comment', async function (req, res, next) {
    try {
        let token = req.cookies["o-token"]
        const username = ordinaryCache.get(token ?? "")
        if (!username) {
            res.status(401)
            res.json(R.notLogin())
            return
        }
        let data = req.body;
        let insert_data = {
            book_id: data.book_id,
            username: username,
            comment: data.comment,
            c_time: dayjs().format("YYYY-MM-DD HH:mm:ss")
        }
        let sql = `insert into comments (book_id, username, comment, c_time)
                   values (${insert_data.book_id}, '${insert_data.username}', '${insert_data.comment}',
                           '${insert_data.c_time}')`

        await exec(sql)
        res.json(R.ok(data = insert_data, msg = "success"))
    } catch (e) {
        res.json(R.error(msg = "server error"))
    }
})
router.get('/ordinary/comment', async function (req, res, next) {
    try {
        let book_id = req.query.book_id
        let sql = `select *
                   from comments
                   where book_id = ${book_id}
                   order by c_time`
        let data = await exec(sql)
        data.forEach((it) => it.c_time = dayjs(it.c_time).format("YYYY-MM-DD HH:mm:ss"))
        res.json(R.ok(data, msg = "success"))
    } catch (e) {
        res.json(R.error(msg = "server error"))
    }
})
router.delete('/ordinary/comment', async function (req, res, next) {
    try {
        let token = req.cookies["o-token"]
        const username = ordinaryCache.get(token ?? "")
        if (!username) {
            res.status(401)
            res.json(R.notLogin())
            return
        }
        let c_time = req.query.c_time
        let sql = `delete
                   from comments
                   where c_time = '${c_time}'
                     and username = '${username}'`
        await exec(sql)
        res.json(R.ok(data = null, msg = "success"))
    } catch (e) {
        res.json(R.error(msg = "server error"))
    }
})
router.post('/ordinary/like', async function (req, res, next) {
    try {
        let token = req.cookies["o-token"]
        const username = ordinaryCache.get(token ?? "")
        if (!username) {
            res.status(401)
            res.json(R.notLogin())
            return
        }

        let book_id = req.body.book_id
        let is_like = req.body.is_like
        let sql = `delete
                   from like_books
                   where book_id = ${book_id}
                     and username = '${username}'`
        await exec(sql)
        if (is_like) {
            sql = `insert into like_books (book_id, username)
                   values (${book_id}, '${username}')`
            await exec(sql)
            res.json(R.ok(data = {is_like: true}, msg = "success"))
            return
        }
        res.json(R.ok(data = {is_like: false}, msg = "success"))
    } catch (e) {
        res.json(R.error(msg = "server error"))
    }
})

router.get('/ordinary/favorite', async function (req, res) {
    const query = req.query
    const page = query.page ?? 1
    const size = 15
    let token = req.cookies["o-token"]
    const username = ordinaryCache.get(token ?? "")
    if (!username) {
        res.status(401)
        res.json(R.notLogin())
        return
    }
    const sql = `SELECT *
                 FROM books as b
                          JOIN like_books as lb
                               ON b.id = lb.book_id
                 WHERE lb.username = '${username}'` + " limit " + (page - 1) * size + "," + size
    let total = await exec(`SELECT count(*)
                            FROM books as b
                                     JOIN like_books as lb
                                          ON b.id = lb.book_id
                            WHERE lb.username = '${username}'`)
    exec(sql).then((data) => {
        res.json(R.ok({list: data,total}, msg = "success"))
    }).catch((err) => {
        res.json(R.error())
    })
})
module.exports = router;
