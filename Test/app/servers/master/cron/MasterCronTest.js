'use strict';
class Cron
{
    constructor(app)
    {
        this.app = app;
    }

    date()
    {
        console.error(`date =>${Date.now()}`);
    }

    // 每隔5秒执行一次 格式: */5 * * * * *
    // 每分钟的第5秒执行一次: 5 * * * * *
    // 每分钟的第0秒和第5秒执行一次: 0,5 * * * * *
    // 每分钟的第0秒到第5秒,间隔1秒执行一次:0-5 * * * * *
    dayTime()
    {
        const upTime = process.uptime();
        if (!this.dayTimeUpTime)
            this.dayTimeUpTime = upTime;
        console.error(`dayTime =>${upTime - this.dayTimeUpTime}`);
    }

    weatherRandom()
    {
        console.error(`weatherRandom =>${Date.now()}`);
    }

    seasonTime()
    {
        console.error(`seasonTime =>${Date.now()}`);
    }
}

module.exports = (app) => {return new Cron(app);};
