const express = require('express');
const dotenv = require('dotenv').config();
const axios =  require('axios');
const redis = require('redis');

const port = process.env.PORT || 3000;



//app initialization
const app = express();



// middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));



//redis connection
let client;

(async()=>{

    client = redis.createClient();

    client.on("error", (error)=>{
        console.log("Error: ", error);
    });

    await client.connect();
     
    client.on("ready", ()=>{
        console.log("connected");
    });
})();


//api call function 

async function FetchDataFromAPI(name){
    const apiResponse = await axios.get(`https://api.genderize.io?name=${name}`);
    console.log("Request sent to api");
    return apiResponse.data;
}




//api to get data 
async function getGenderData(req, res){
    let name = req.params.name;
    let result;
    let isCached = false;
    try{
        const cacheResult = await client.get(name);

        // if result is in cache, get them
        if(cacheResult){
            isCached = true;
            result = JSON.parse(cacheResult);
        }

        // if results are not cached, get from the Api
        else{
            result = await FetchDataFromAPI(name);
            if(result.length ===0){
                console.log("API returned an empty response");
            }

            //to cache result when key not found in redis
            await client.set(name, JSON.stringify(result), {EX:180, NX:true});
        }

        res.send({fromCache: isCached, data : result});
        
    }
    catch(err){
        console.log(err);
        res.send(404, "Data unavialable");
    }

}

//route
app.get('/getgender/:name', getGenderData);

//app listen
app.listen(port, ()=>{
    console.log(`Server listening at port ${port} \nGo to http://localhost:5000/getgender/name (add some name in place of 'name')`);
})
