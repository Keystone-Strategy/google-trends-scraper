//date is in format YYYY-MM-DD

const startDate = "2022-01-01"
const endDate = "2023-01-01"
const keyword = "CVS Covid Vaccine"
const geoCodes = require('./geoCodes.json')
const fs = require('fs')
const randomUseragent = require('random-useragent');

const headers = {
    'authority': 'trends.google.es',
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en,es-ES;q=0.9,es-419;q=0.8,es;q=0.7,bs;q=0.6',
    'cache-control': 'no-cache',
    'content-type': 'application/json;charset=UTF-8',
    'cookie': '__utmc=119162188; __utmz=119162188.1699295551.1.1.utmcsr=trends.google.es|utmccn=(referral)|utmcmd=referral|utmcct=/; __utma=119162188.1422013800.1699295545.1699295551.1699299664.2; __utmt=1; __utmb=119162188.6.9.1699299679368; NID=511=PaIFrgXfawno3TMHtTM8YRAqIJmhOSRnmml0tahm8ACC3uXxbv4Rg34f2cv2nh0B1CD7XwjdgHDMP0WFIjxTLdYNMRKA-1XcdRODEIAA1Y6TsbBCl0LOGVh42kwoXywSS4HCveeQ0Wnvcwa5SgpW6LZOlbwjVPR7BbmqsNuXBSM; _gid=GA1.3.515249970.1699295546; OTZ=7283192_72_74__74_; _ga=GA1.3.1422013800.1699295545; _gat_gtag_UA_4401283=1; _ga_VWZPXDNJJB=GS1.1.1699299664.2.1.1699299680.0.0.0',
    'origin': 'https://trends.google.es',
    'pragma': 'no-cache',
    'referer': 'https://trends.google.es/trends/explore?date=2022-01-01%202023-01-01&geo=US-AL&q=CVS%20Covid%20Vaccine&hl=es',
    'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
    'sec-ch-ua-arch': 'x86',
    'sec-ch-ua-bitness': '64',
    'sec-ch-ua-full-version': '119.0.6045.105',
    'sec-ch-ua-full-version-list': '"Google Chrome";v="119.0.6045.105", "Chromium";v="119.0.6045.105", "Not?A_Brand";v="24.0.0.0"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-model': '""',
    'sec-ch-ua-platform': 'Windows',
    'sec-ch-ua-platform-version': '15.0.0',
    'sec-ch-ua-wow64': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'x-client-data': 'CJa2yQEIpbbJAQipncoBCNznygEIlqHLAQjzmM0BCIWgzQEI/LHNAQjcvc0BCNrDzQEI6MXNAQi41s0BCKfYzQEI0dvNAQjy280BCOzdzQEImN7NAQi23s0BCLTfzQEItODNAQ==',
    'x-client-id': '7283192',
}

const outputFolder = "./output"

main()

async function main(){
    for (const geoCode of geoCodes) {
        //skip if csv file exists
        
        const folderName = `${startDate}_${endDate}`

        if (!fs.existsSync(`${outputFolder}/${folderName}`)){
            fs.mkdirSync(`${outputFolder}/${folderName}`);
        }

        if (fs.existsSync(`${outputFolder}/${folderName}/${geoCode}__${folderName}.csv`)){
            console.log(`Skipping ${geoCode} as it already exists`)
            continue
        }

        console.log({
            geoCode,
            startDate,
            endDate
        })

        const widget = await getWidgetListData(geoCode, keyword, startDate, endDate)
        
        let csvData

        while(true){
            csvData = await getWidgetCSV(widget)
            if(csvData.includes("error")) {
                console.log("Error getting CSV data, Generate new Agent and retrying...")
                Object.assign(headers, randomAgent())
                await sleep(500)
            } else break;
        }

        const csvDataWithoutHeaders = csvData.split("\n").slice(2).join("\n") //remove unused headers

        fs.writeFileSync(`${outputFolder}/${folderName}/${geoCode}__${folderName}.csv`, csvDataWithoutHeaders, 'utf8')

        await sleep(5000)

    }
}

async function getWidgetListData(geolocation, keyword, startDate, endDate){

    const data = {
        "comparisonItem":[
            {
                "keyword": encodeURIComponent(keyword),
                "geo":geolocation,
                "time":`${startDate}+${endDate}`
            }
        ],
        "category":0,
        "property":""
    }
    const url = `https://trends.google.es/trends/api/explore?hl=es&tz=240&req=${JSON.stringify(data)}&tz=240`
    const res = await fetch(url, {
        headers,
        "method": "POST",
    }).then(e=>e.text())
    return JSON.parse(res.split(")]}'")[1]).widgets[0]
}

async function getWidgetCSV({request, token}){
    console.log({
        userType: request.userConfig.userType
    })
    //request.userConfig.userType = 'USER_TYPE_LEGIT_USER'
    const url = `https://trends.google.es/trends/api/widgetdata/multiline/csv?req=${ encodeURIComponent( JSON.stringify(request)) }&token=${token}&tz=240`
    
    console.log({
        url
    })

    const res = await fetch(url, {
        headers: {
            ...headers,
        },
    }).then(e=>e.text())
    return res
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomAgent(){
    const userAgent = randomUseragent.getRandom();
    const userAgentComponents = userAgent.split(' ');

    // Extraer información del User-Agent
    const browserInfo = userAgentComponents[0].split('/');
    const browserName = browserInfo[0];
    const browserVersion = browserInfo[1];

    const osInfo = userAgentComponents.slice(1, 4);
    const osName = osInfo.join(' ');

    // Construir los encabezados "sec-ch-ua"
    const secChUA = `"${browserName}";v="${browserVersion}", "Chromium";v="${browserVersion}", "Not?A_Brand";v="24"`;
    const secChUAArch = 'x86';
    const secChUABitness = '64';
    const secChUAFullVersion = `${browserVersion}.0.0.0`;
    const secChUAFullVersionList = `"${browserName}";v="${browserVersion}.0.0.0", "Chromium";v="${browserVersion}.0.0.0", "Not?A_Brand";v="24.0.0.0"`;
    const secChUAMobile = '?0';
    const secChUAModel = '""';
    const secChUAPlatform = osName;
    const secChUAPlatformVersion = '15.0.0';
    const secChUAWow64 = '?0';

    const headers = {
        'sec-ch-ua': secChUA,
        'sec-ch-ua-arch': secChUAArch,
        'sec-ch-ua-bitness': secChUABitness,
        'sec-ch-ua-full-version': secChUAFullVersion,
        'sec-ch-ua-full-version-list': secChUAFullVersionList,
        'sec-ch-ua-mobile': secChUAMobile,
        'sec-ch-ua-model': secChUAModel,
        'sec-ch-ua-platform': secChUAPlatform,
        'sec-ch-ua-platform-version': secChUAPlatformVersion,
        'sec-ch-ua-wow64': secChUAWow64,
        'user-agent': userAgent,
    };
    return headers
}