const NodeCache = require("node-cache");
const loginCache = new NodeCache({
    stdTTL: 60 * 60,
    checkperiod: 600,
});
const ordinaryCache = new NodeCache({
    stdTTL: 60 * 60,
    checkperiod: 600,
});
module.exports = {
    loginCache,
    ordinaryCache
}