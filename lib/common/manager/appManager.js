'use strict';
const util = require('util');
const logger = require('pomelo-logger-upgrade').getLogger('pomelo', __filename);
const transactionLogger = require('pomelo-logger-upgrade').getLogger('transaction_log', __filename);

const manager = module.exports;

manager.transaction = function(name, conditions, handlers, retry)
{
    if (!retry)
    {
        retry = 1;
    }
    if (typeof name !== 'string')
    {
        logger.error('transaction name is error format, name: %s.', name);
        return;
    }
    if (typeof conditions !== 'object' || typeof handlers !== 'object')
    {
        logger.error('transaction conditions parameter is error format, conditions: %j, handlers: %j.', conditions, handlers);
        return;
    }

    const cmethods = [], dmethods = [], cnames = [], dnames = [];
    for (const key in conditions)
    {
        if (typeof key !== 'string' || typeof conditions[key] !== 'function')
        {
            logger.error('transaction conditions parameter is error format, condition name: %s, condition function: %j.', key, conditions[key]);
            return;
        }
        cnames.push(key);
        cmethods.push(conditions[key]);
    }

    // execute conditions
    (async() => {
        let i = 0;
        try {
            // check conds
            for ( const method of cmethods ) {
                if ( util.types.isAsyncFunction( method ) ) {
                    await method();
                } else {
                    await util.promisify( method )();
                }

                transactionLogger.info('[%s]:[%s] condition is executed.', name, cnames[i]);
                i++;
            }

            // execute handlers
            process.nextTick( async function() {
                for (const key in handlers) {
                    if (typeof key !== 'string' || typeof handlers[key] !== 'function') {
                        logger.error('transcation handlers parameter is error format, handler name: %s, handler function: %j.', key, handlers[key]);
                        return;
                    }
                    dnames.push(key);
                    dmethods.push(handlers[key]);
                }

                let flag = true;
                const times = retry;

                // do retry if failed util retry times
                while ( retry > 0 && flag ) {
                    let j = 0;
                    try {
                        retry--;

                        for ( const method of dmethods ) {
                            if ( util.types.isAsyncFunction( method ) ) {
                                await method();
                            } else {
                                await util.promisify( method )();
                            }

                            transactionLogger.info('[%s]:[%s] handler is executed.', name, dnames[j]);
                            j++;
                        }

                        flag = false;
                        process.nextTick(function() {
                            transactionLogger.info('[%s] all conditions and handlers are executed successfully.', name);
                        });

                    } catch ( errHandler ) {
                        process.nextTick(function() {
                            transactionLogger.error('[%s]:[%s]:[%s] handler is executed with err: %j.', name, dnames[--j], times - retry, errHandler.stack);
                            const log = {
                                name: name,
                                method: dnames[j],
                                retry: times - retry,
                                time: Date.now(),
                                type: 'handler',
                                description: errHandler.stack
                            };
                            transactionLogger.error(JSON.stringify(log));
                        });
                    }

                }
            });
        } catch (err) {
            process.nextTick(function() {
                transactionLogger.error('[%s]:[%s] condition is executed with err: %j.', name, cnames[--i], err.stack);
                const log = {
                    name: name,
                    method: cnames[i],
                    time: Date.now(),
                    type: 'condition',
                    description: err.stack
                };
                transactionLogger.error(JSON.stringify(log));
            });
        }
    })();

};
