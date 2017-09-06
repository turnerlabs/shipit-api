module.exports = {
    error: next => {
        return reason => {
            let errs = reason.errors || [];

            console.log('ERROR => ', reason);

            switch (reason.message) {
                case 'notNull Violation: name cannot be null':
                case 'notNull Violation: image cannot be null':
                case 'notNull Violation: value cannot be null':
                case 'Validation error: Validation isIn failed':
                case 'Validation error: Validation isUppercase failed':
                case 'Validation error: Validation notContains failed':
                reason.statusCode = 422;
                break;

                case 'Validation error':
                reason.statusCode = 409;
                break;

                default:
                reason.statusCode = reason.statusCode || 500;
                console.error('ERROR(%s)', JSON.stringify(reason, null, 2));
                break;
            }

            next({statusCode: reason.statusCode, message: reason.message +': '+ errs.map(e => e.message).join(', ')});
        };
    },
    fetched: (res, msg) => {
        return result => {
            if (result) {
                res.status(200).json(result);
            }
            else {
                res.status(404).json({ code: 404, message: msg || 'Object not found.' });
            }
        };
    },
    created: (res, msg) => {
        return result => {
            if (result) {
                res.status(201).json(result);
            }
            else {
                res.status(400).json({ code: 400, message: msg || 'Object not created.'})
            }
        }
    },
    updated: (res, msg) => {
        return result => {
            if (result) {
                res.status(200).json(result);
            } else {
                res.status(400).json({ code: 400, message: msg || 'Object not updated.', result: result });
            }
        }
    },
    deleted: (res, msg) => {
        return result => {
            if (result) {
                res.status(200).json({ code: 200, status: 'ok'});
            } else {
                res.status(400).json({ code: 400, status: msg || 'Object not deleted.' });
            }

        }
    }
};
