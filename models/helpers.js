var randomstring = require("randomstring");
var e = module.exports;

e.generateToken = function(length) {
  return randomstring.generate(length || 50);
}

e.isString = function(callBack,i) {
  callBack((typeof i === 'string'));
}

e.isInteger = function(callBack,i) {
  callBack(Number.isInteger(i));
}

e.isValidDockerLink = function(callBack,i) {
  var regexp = /^([a-zA-Z0-9.-]*)(\/?([a-z0-9.-]{1,63}))+:?([a-zA-Z0-9.-]*)$/
  callBack(regexp.test(i));
}

e.isValidPort = function(callBack,i) {
  callBack((typeof i === 'number' && i >= 1 && i <= 65535));
}

e.isValidEnvVarType = function(callBack,i) {
  if(typeof i === 'string') {
    callBack(( i === 'basic' || i === 'discover' || i === 'hidden'));
    return;
  } callBack(false);
}

e.isValidProvider = function(callBack,i) {
  if(typeof i === 'string') {
    callBack(( i === 'ec2' || i === '56m'));
    return;
  } callBack(false);
}

e.isValidSslManager = function (callback, i) {
    if (typeof i === 'string') {
        callback((i === 'iam' || i === 'acm'));
        return;
    }

    callback(false);
}

e.isValidHealthcheckProtocol = function(callBack,i) {
  if(typeof i === 'string') {
    callBack(( i === 'http' || i === 'tcp' || i === 'https'));
    return;
  } callBack(false);
}

e.isValidName = function(callBack,i) {

  if(typeof i !== 'string' || i === '---') {
    callBack(false);
    return;
  }

  callBack( /^[A-Za-z0-9_-]+$/.test(i) );
}

e.isValidEnvVar = function(callBack,i) {
  if(typeof i !== 'string' || i === '___') {
    callBack(false);
    return;
  }

  callBack(/^[A-Za-z_][A-Za-z0-9_]*$/.test(i));
}

e.isBoolean = function(callBack,i) {
  callBack((typeof i === 'boolean'));
}

e.isBooleanAndExternal = function(callback, i, r, o) {
    var bool = typeof i === 'boolean',
        allowed = false;

    if (bool && o) {
        allowed = true;

        // Cannot set true, unless external is public
        if (i && o.external === false) allowed = false;
    }

    callback(allowed);
}

e.isValidContainerArray = function(callBack,i) {
  if(typeof i !== 'object') callBack(false);
  else if(! Array.isArray(i)) callBack(false);
  else if(i.length !== 1) callBack(false);
  else callBack(true);
}

e.isValidInteger = function(callBack,i) {
  if(typeof i !== 'number') callBack(false);
  else if(i < 0) callBack(false);
  else callBack((i === (i|0)));
}

e.validGroupForUser = function(callBack,i,r,o,m) {

}
