/** VGG 2020-06-09 version of the Node.js 10 Cloud function for
 *  COVID-19 API or Watson Discovery function form IBM
 */


/**
 *
 * main() will be run when you invoke this action
 *
 * @param Cloud Functions actions accept a single parameter, which must be a JSON object.
 *
 * @return The output of this action, which must be a JSON object.
 *
 */
var request = require("request-promise");
const DiscoveryV1 = require("watson-developer-cloud/discovery/v1");

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

async function main(params) {


  if (params.type === "api") {
   /*
    * Use of the 'Johns Hopkins CSSE' resource
    */
    try {
      const summary = await request({
        method: "GET",
        uri: "https://api.covid19api.com/summary",
        json: true
      });

      if (params.country) {
        for (var i = 0; i < summary.Countries.length; i++) {
          if (
            summary.Countries[i].Country.toLowerCase() ===
            params.country.toLowerCase()
          ) {
            return {
              result: `Total Cases: ${summary.Countries[i].TotalConfirmed}\nTotal Deaths: ${summary.Countries[i].TotalDeaths}\nTotal Recovered: ${summary.Countries[i].TotalRecovered}\n\nSource: Johns Hopkins CSSE`
            };
          }
        }
        return { error: "did not find country" };
      }
      let totalCases = 0;
      let totalDeaths = 0;
      let totalRecovered = 0;

      for (var i = 0; i < summary.Countries.length; i++) {
        totalCases += summary.Countries[i].TotalConfirmed;
        totalDeaths += summary.Countries[i].TotalDeaths;
        totalRecovered += summary.Countries[i].TotalRecovered;
      }
      return {
        result: `Total Cases: ${totalCases}\nTotal Deaths: ${totalDeaths}\nTotal Recovered: ${totalRecovered}\n\nSource: Johns Hopkins CSSE`
      };
    } catch (err) {
      return { error: "it failed : " + err };
    }
  } else {
    /*
    * Use of the 'Watson Discovery' as resource
    */
    const discovery = new DiscoveryV1({
      version: "2019-03-25",
      iam_apikey: params.api_key,
      url: params.url
    });

    const offset = getRandomInt(50);

    const queryParams = {
      //configuration_id: params.config_id, //VGG: adding configuration_id for web crawlers 
      environment_id: params.env_id,
      collection_id: params.collection_id,
      natural_language_query:
        "corona virus " + params.input || "corona virus news",
      filter: params.filter || '',
      count: 3,
      offset: offset
    };
    
    /* VGG: adding filters */
    if (params.filter){
        if (params.filter.toLowerCase()=="funding"){
            queryParams.filter="enriched_text.concepts.text:"+params.funding;
            if (params.location){
            queryParams.filter=queryParams.filter+", enriched_text.entities.text:"+params.location;
            }
        };
         if (params.filter.toLowerCase()=="location"){
            queryParams.filter="enriched_text.entities:(relevance>0.9,text::"+params.location+")";
        };
        
    };

    
    try {
      data = await discovery.query(queryParams);
      
      if (data.results == undefined ) {
          return { "discovery response error" : data };
      }
      
      let response = data.results.map((v, i) => {
        return `${v.title}
                 ${v.text}
                 ${v.url}`;
      });
      return {
        result:
          // "Here are three news article I found online.\n\n" +
          "\n\n" +response.join("\n\n")
      };
    } catch (err) {
      return { error: "it failed : " + err };
    }
  }
}
