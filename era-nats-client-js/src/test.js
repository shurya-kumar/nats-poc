var axios = require('axios');

let successCount = 0, errorCount = 0;
function sendAPI(config){
  axios(config).then(function (response) {
    console.log(JSON.stringify(response.data));
    successCount = successCount + 1;
  })
  .catch(function (error) {
    console.log(error)
    errorCount = errorCount + 1;
  })
  .finally(() => {
    console.log(`Success count: ${successCount} ..... Error count: ${errorCount}`)
  });
  console.log("Request sent")
}

var config = {
  method: 'post',
  url: 'http://localhost:7000/publish-message',
  headers: {
    'Content-Type': 'application/json'
  }
};

setTimeout(()=>{
  var i, coun=0;
  for (i = 0; i < 100; i++) {
    config.data = JSON.stringify({
      "subject": "tenant.1.ops",
      "message": `VAMPIRE SHURYA ${i}`
    });
    coun = coun + 1;
    sendAPI(config);
  }
}, 2000);

