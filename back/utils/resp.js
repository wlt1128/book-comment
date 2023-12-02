class R {
    constructor(code, msg, data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    static ok(data,msg) {
        return new R(200, msg, data);
    }

    static error(msg,data) {
        return new R(500, msg, null);
    }

    static notLogin() {
        return new R(401, 'not login', null);
    }
    static LoginFail(data) {
        return new R(401, 'username or password error！', data);
    }

    static notFound() {
        return new R(404, 'api is not found', null);
    }
}


module.exports = R;