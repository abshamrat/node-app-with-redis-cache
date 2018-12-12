const bluebird = require("bluebird");
const express = require('express');
const path = require('path');
const axios = require('axios');
const redis = require('redis');
const app = express();


const port = process.env.port || 5000;
const REDIS_URL = process.env.REDIS_URL || "http://localhost:6379";
const API_URL = 'https://api.exchangeratesapi.io';

const client = redis.createClient(REDIS_URL);
// make node_redis promise compatible
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

client.on('connect', () => {
    console.log(`connected to redis`);
});
client.on('error', err => {
    console.log(`Error: ${err}`);
});

app.listen(port, () => {
    console.log(`App listening on port ${port}!`)
});

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: path.join(__dirname, 'views')
    });
});
app.get('/rate/:date', (req, res) => {
    const date = req.params.date;
    const url = `${API_URL}/${date}?base=USD`;
    const countKey = `USD:${date}:count`;
  const ratesKey = `USD:${date}:rates`;
  
  let count;
  client
    .incrAsync(countKey)
    .then(result => {
      count = result;
      return count;
    })
    .then(() => client.hgetallAsync(ratesKey))
    .then(rates => {
      if (rates) {
        return res.json({ rates, count });
      }

      axios.get(url).then(response => {
        client
          .hmsetAsync(ratesKey, response.data.rates)
          .catch(e => {
            console.log(e)
          });
        return res.json({
          count,
          rates: response.data.rates
        });
      }).catch(error => res.json(error.response.data))

    })
    .catch(e => {
      console.log(e)
    });

});

