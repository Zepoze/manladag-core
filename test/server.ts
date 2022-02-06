
import express, {} from 'express';
import {createReadStream} from 'fs';
import path from 'path';
import {host, urlToImage, urlToTextTimeout} from './env';

function extractQuery(url:string) {
  return new RegExp(`^${host}(\/.+)$`).exec(url)![1];
}

let _imageTimeout:number = 0;
export function imageTimeout(val?:number) {
  if (val as number >= 0) _imageTimeout = val as number;
  return _imageTimeout;
}

export default async function getServer(port:number) {
  const app = express();


  app.get(extractQuery(urlToImage), function(req, res) {
    setTimeout(()=> {
      createReadStream(path.join(__dirname, 'image.jpg')).pipe(res);
    }, imageTimeout());
  });
  app.get(extractQuery(urlToTextTimeout), function(req, res) {
    res.write('hello world');
    setTimeout(()=> {
      res.end();
    }, imageTimeout());
  });
  app.use(function(req, res) {
    res.status(404).send('error');
  });

  return app.listen(port, '127.0.0.1');
}

