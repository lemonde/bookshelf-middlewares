'use strict';

var _ = require('lodash');

var backboneFormatter = require('../formatters/backbone');
var bkOptionsFormatter = require('../formatters/bookshelf-options');
var whereFormatter = require('../formatters/where');

// Bookshelf options keys.
var OPTIONS_KEYS = ['sortBy', 'sortDirection', 'limit', 'offset', 'count', 'withRelated'];

module.exports = function (options) {
  return function (req, res, next) {
    var bkOpts = bkOptionsFormatter(OPTIONS_KEYS, req.query, options, {
      sortBy: 'id',
      sortDirection: 'desc',
      limit: 20,
      offset: 0
    });

    var where = whereFormatter(_.union(OPTIONS_KEYS, options.omit), req.query);

    // Pick array values from where.
    var whereIn = _.pick(where, _.isArray);
    where = _.omit(where, _.isArray);

    var query = {};
    query[options.related] = function (qb) {
      _.forIn(whereIn, function (val, key) {
        qb.whereIn(options.related + '.' + key, val);
      });
      qb.where(where)
        .limit(bkOpts.limit)
        .offset(bkOpts.offset)
        .orderBy(bkOpts.sortBy, bkOpts.sortDirection);
    };

    options.model.forge({id: req.params.id})
    .fetch({withRelated: [options.related, query]})
    .exec(function (err, output) {
      res.body = backboneFormatter.formatModel(output);
      res.body = res.body[options.related];

      // Set metadata on output.
      res.metadata = {
        offset: bkOpts.offset,
        limit: bkOpts.limit,
        count: null
      };

      next();
    });
  };
};
