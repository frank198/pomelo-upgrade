var ConnectionService = require('../common/service/connectionService'),
    _ = require('lodash');

/**
 * Connection component for statistics connection status of frontend servers
 */
module.exports = function(app) {
  return new Component(app);
};

var Component = function(app) {
  this.app = app;
  this.service = new ConnectionService(app);

  // proxy the service methods except the lifecycle interfaces of component
  const self = this;

  var getFun = function(m) {
    return (function() {
          return function() {
            return self.service[m].apply(self.service, arguments);
          };
    })();
  };

    const prototypeOf = Object.getPrototypeOf(this.service);
    const propertyNames =  Object.getOwnPropertyNames(prototypeOf);
    _.forEach(propertyNames, propertyName=>
    {
        if(propertyName !== 'start' && propertyName !== 'stop' && propertyName != 'constructor')
        {
            const method = prototypeOf[propertyName];
            if(_.isFunction(method)) {
                this[propertyName] = getFun(propertyName);
            }
        }
    })
};

Component.prototype.name = '__connection__';
