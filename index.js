var AWS = require('aws-sdk');

var ec2 = new AWS.EC2();


exports.handler = async (event, context, callback) => {
    
var regions = process.env.regions; 
if(!regions) {regions = await getRegions();}

console.log("region", regions[0])
var outPutArray =   {"success" : [],"failure": [] };
outPutArray = await processRegions(outPutArray, regions);
console.log("finalOutput", JSON.stringify(outPutArray));
callback (null, outPutArray);
};

var processRegions = (outPutArray, regions)=>{
    return new Promise(async (resolve, reject)=>{
    console.log("inside process regions") ;
    if(regions.length != 0){
    
    var lambda = new AWS.Lambda({region: regions[0]});
    //console.log("Lambda", lambda);
    var region = regions[0];
    var tempArray = await listFunctions("", outPutArray, lambda, region);
    console.log("tempArray", tempArray);
   
   // console.log("region", region)
   // outPutArray[region] = tempArray ;
    regions.splice(0,1);
   // console.log("Regions after splice", regions)
    resolve(await processRegions(outPutArray, regions));
    
}else{
    
    //console.log("finalOutput", outPutArray);
    resolve(outPutArray) ;
}
        
    })
}

var getRegions = ()=>{
    return new Promise((resolve, reject)=>{
        
        var params = {
                        };
 ec2.describeRegions(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else   {
      // console.log(JSON.stringify(data)); 
       var regions = [] ;
        regions = data.Regions.map(function (regions) {
                      return regions.RegionName
                    });
        //console.log("Regions", JSON.stringify(regions));
        //console.log("Type of region", typeof regions );
        resolve(regions);
   }
    })

})

}

var listFunctions = (NextMarker, outPutArray, lambda, region)=>{
	return new Promise((resolve, reject) => {
		
	console.log("Inside listFunctions")	;
    var params ;
    
            if(NextMarker == "")
            {
                
                params = {
            	FunctionVersion: "ALL",
                };
                
            }else{
                
                    params = {
            	FunctionVersion: "ALL",
            	Marker: NextMarker
                };
                
            }
    
    
            lambda.listFunctions(params,  async function (err, data){
                
                	if (err) console.log(err, err.stack); // an error occurred
                	
                	else{
                	    
                	    //console.log("AAAAAAAAAAAAAAAAAA", data);
                	    var functionsArray = data.Functions ;
                	    //console.log(functionsArray);
                	    
                	   
                	      outPutArray =  await checkRuntime(functionsArray, outPutArray, lambda, region);
                	      console.log("lambda in listFunctions", lambda, region);
                	      
            				if( data.NextMarker)
            				{   //console.log("outPutArray aaaaaaaaaaaaaaa", outPutArray)
            					 resolve(await listFunctions(data.NextMarker, outPutArray, lambda, region));
            				}
            				else if(!data.NextMarker){
            				    //console.log("outPutArray in listFunctions while resolving", outPutArray);
            					resolve (outPutArray);
            				}
          
                		}
              
            });
    
    

	})
}

var checkRuntime = (functionsArray, outPutArray, lambda, region)=>{
    return new Promise( async(resolve, reject)=>{
        //	console.log("Inside checkRuntime")	;
         if(functionsArray.length != 0)
        	    {   console.log("Run TIme",functionsArray[0].Runtime )
        	        if (functionsArray[0].Role !='' && functionsArray[0].Runtime == process.env.from_run_time) {
        				//nodejs10.x
        				//nodejs8.10
        			
        				let success = outPutArray.success;
        				let failure = outPutArray.failure;
        				let obj = {};
        				console.log(functionsArray[0].FunctionName);
        				
        			    let status = 	 await updateRunTime(functionsArray[0].FunctionName, lambda);
        			    
        			    if(status == "updated"){
        			        	obj.Name  = functionsArray[0].FunctionName;
        			        	obj.region = region;
                				obj.ACCOUNT_NAME = process.env.ACCOUNT_NAME;
                			//	obj.environment = process.env.environment;
                				obj.previous_runTime = functionsArray[0].Runtime;
                				obj.current_runTime = process.env.to_run_time;
                				success.push(obj);
        			        
        			    }else if(status == "failed"){
        			        
        			        	obj.Name  = functionsArray[0].FunctionName;
                				obj.ACCOUNT_NAME = process.env.ACCOUNT_NAME;
                			//	obj.environment = process.env.environment;
                				obj.current_runTime = functionsArray[0].Runtime;
                				failure.push(obj);
        			    }
        			    
        			    outPutArray.success = success;
        			    outPutArray.failure = failure;
        			    functionsArray.splice(0,1);
        			    resolve(await checkRuntime(functionsArray, outPutArray, lambda, region));
        				
        				}else{
        				  functionsArray.splice(0,1);
        				  resolve(await checkRuntime(functionsArray, outPutArray, lambda, region));
        				}
        				
        	    }
        	    else{
        	        console.log("Resolving outPutArray in checkRuntime", outPutArray);
        	        resolve(outPutArray);
        	    }
        				
        	    
    })
}

var updateRunTime = (functionName, lambda) =>{
    
    return new Promise((resolve, reject)=>{
       console.log("Inside updateRunTime")	;
                        var params = {
        					FunctionName: functionName,
        					Runtime: process.env.to_run_time
        
        				};
        				//nodejs10.x
        				//nodejs8.10
        				lambda.updateFunctionConfiguration(params, async function (err, data) {
        
        					if (err) {
        						console.log("Function In Error", functionName); ;
        						console.log(err, err.stack); 
        						resolve("failed");
        						}
        					else {
        						console.log(JSON.stringify(data));
        					    resolve("updated");
        						}// successful response
        					
        
        				});
    })
}