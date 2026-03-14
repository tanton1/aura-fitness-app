import fs from 'fs';
import https from 'https';

const url = 'https://drive.google.com/uc?export=download&id=1OtgfrZOFF8EbaDp9OlAlRQumQpxLof27';

function download(url, dest) {
  https.get(url, (res) => {
    if (res.statusCode === 302 || res.statusCode === 303) {
      console.log('Redirecting to:', res.headers.location);
      download(res.headers.location, dest);
    } else {
      console.log('Status:', res.statusCode);
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded to', dest);
      });
    }
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

download(url, './public/logo.png');
