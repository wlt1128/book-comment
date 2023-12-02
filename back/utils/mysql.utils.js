const mysql = require('mysql')

// 加密模块中的随机生成数
const { randomInt } = require('crypto')
const sqlconfig = {
    host: '127.0.0.1',
    user:'root',
    password:'server@21',
    database:'sys_book',
}


// 方式2   使用连接池 pool.createPool()
let pool = mysql.createPool(sqlconfig)
// 执行数据库
const exec2 = (sql,values) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if (err) {
                //连接错误
                reject(err)
            } else {
                //连接成功
                // sql语句中使用?占位符, values传递是个数组
                conn.query(sql,values, (err, data) => {
                    if (err) {
                        //操作失败
                        reject(err)
                    } else {
                        resolve({
                            code: 0,
                            message: '操作成功!',
                            data,
                        })
                        // resolve(data)
                    }
                })
            }
            // 当连接不再使用时，用conn对象的release方法将其归还到连接池中
            conn.release()
        })
    })
}

const exec = (sql) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if (err) {
                //连接错误
                reject(err)
            } else {
                //连接成功
                conn.query(sql, (err, data) => {
                    if (err) {
                        //操作失败
                        reject(err)
                    } else {
                        resolve(data)
                    }
                })
            }
            // 当连接不再使用时，用conn对象的release方法将其归还到连接池中
            conn.release()
        })
    })
}

module.exports = {
    exec,
    exec2,
}