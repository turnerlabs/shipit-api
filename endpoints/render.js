module.exports = endPoints => {
    var methods = Object.keys(endPoints);

    methods.forEach(method => {
        endPoints[method].forEach(endPoint => {
            endPoint.headers = endPoint.headers || [];
            if (endPoint.fields.length > 0) {
                endPoint.fields = endPoint.fields.reduce((prev, cur) => {
                    if (cur.field === "username" || cur.field === "token") {
                        cur.field = "x-" + cur.field;
                        endPoint.headers.push(cur);
                    } else {
                        prev.push(cur)
                    }
                    return prev
                }, [])
            }
        });
    });

    return endPoints;
}
