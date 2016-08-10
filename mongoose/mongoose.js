var mongoose  = require('mongoose');
var singular  = require('pluralize').singular;
var modelP    = require('./genMongooseModels');

var mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shipit';
var e = module.exports;
var config = {};

config.mongodb = {
  url: mongoURI,
  options: {
    db: {
      w: 1,
      socketOptions: {
        keepAlive: 120,
        connectTimeoutMS: 30000
      }
    },
    server: {
      socketOptions: {
        keepAlive: 120,
        connectTimeoutMS: 30000
      },
      auto_reconnect: true
    }
  }
};

mongoose.connect(config.mongodb.url, config.mongodb.options);

e.DB = mongoose.connection;

var Schema = mongoose.Schema;

e.models = {};

schemas = modelP.genSchemas();

Object.keys(schemas).forEach(function(schema) {
  var tempSchema = new Schema(schemas[schema].model);
  var word = schema;
  word = word[0].toUpperCase() + word.slice(1);
  e.models[word] = mongoose.model(word,tempSchema);
  e[word] = e.models[word];
  schemas[schema].indexes.forEach(function(ind) {
    tempSchema.index(ind.fields,{unique: ind.unique});
  });
});
