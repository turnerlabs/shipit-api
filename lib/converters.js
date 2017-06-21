module.exports = {
    arrToObj: arr => {
        let obj = {};

        arr.forEach(ele => obj[ele.key] = ele.value);

        return obj;
    },
    objToArr: obj => {
        let arr = [],
            keys = Object.keys(obj);

        keys.forEach(key => {
            arr.push({
                key: key,
                value: obj[key]
            });
        });

        return arr;
    }
};
