#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';
import { parseArgs } from 'util';

const branchIds = {
  montreal: 1,
  quebec: 2,
  toronto: 3,
};

const { values } = parseArgs({
  options: {
    delay: {
      type: 'string',
      short: 'd',
      default: '15',
    },
    city: {
      type: 'string',
      short: 'c',
      default: 'toronto',
    },
    location: {
      type: 'string',
      short: 'l',
    },
  }
});

// In km
const earthRadius = 6371;

// In seconds
const pause = parseInt(values.delay);

const distanceRadii = [
  10000,
  8000,
  6000,
  5000,
  4000,
  3000,
  2000,
  1500,
  1000,
  900,
  800,
  700,
  600,
  500,
  400,
  300,
  200,
];

let distanceRadius = distanceRadii[0];

let notificationId, notifyResult;

if (!branchIds[values.city]) {
  throw new Error(`City ${values.vity} not yet supported! File a bug`);
}
const branchId = branchIds[values.city];

console.log('Using City Branch: %s. Branch ID: %i', values.city, branchId);


const location = values.location ? values.location.split(',').map(c => parseFloat(c.trim())) : getLocation();
console.log('Current location: %s, %s', ...location);



while(true) {
  const cars = await getCars(location);
  const filteredCars = cars
    .filter(car => car.distance <= distanceRadius)
    .sort((a,b) => a.distance - b.distance);

  if (process.env.DEBUG) console.log(cars);

  console.log(
    '%i cars found. %i within %s. Waiting %i seconds',
    cars.length,
    filteredCars.length,
    humanDistance(distanceRadius),
    pause,
  );

  if (filteredCars.length) {

    const car = filteredCars[0];

    const nextSmallerRadius = distanceRadii.find(i => i < car.distance);

    const args = [
      '-u',
      'critical',
      '-t', '6000',
      '-p',
      '-A', 'open=Reserve',
      '-A', 'stop=Stop looking',
      'Car found!',
      `${car.brand} ${car.model} is ${Math.floor(car.distance)}m away`
    ];
    if (nextSmallerRadius) {
      args.push('-A', 'reduce=Reduce radius to ' + humanDistance(nextSmallerRadius));
    }
    if (notificationId) args.push('-r', notificationId);

    const res = spawnSync('notify-send', args);

    [notificationId, notifyResult] = res.stdout.toString().split('\n');
    switch(notifyResult) {
      case 'open':
        spawnSync('xdg-open', ['https://ontario.client.reservauto.net/bookCar']);
        break;
      case 'reduce' :
        distanceRadius = nextSmallerRadius;
        break;
      case 'stop':
        process.exit();
    }

  }

  await wait(pause * 1000);

}

//https://www.reservauto.net/WCF/LSI/LSIBookingServiceV3.svc/GetAvailableVehicles?BranchID=2&LanguageID=2
//https://www.reservauto.net/WCF/LSI/LSIBookingServiceV3.svc/GetAvailableVehicles?BranchID=2&LanguageID=2


async function getCars(location) {

  const url = `https://www.reservauto.net/WCF/LSI/LSIBookingServiceV3.svc/GetAvailableVehicles?BranchID=${branchId}&LanguageID=2`;

  if (process.env.DEBUG) {
    console.log('Url: %s', url);
  }

  const result = await retry(
    async() => fetch(url)
  );
  const json = await result.json();
  return json.d.Vehicles.map( vehicle => ({
    brand: vehicle.CarBrand,
    model: vehicle.CarModel,
    plate: vehicle.CarPlate,
    color: vehicle.CarColor,
    lat: vehicle.Latitude,
    lng: vehicle.Longitude,
    distance: calculateDistance(...location, vehicle.Latitude, vehicle.Longitude),
  }));

}

function getLocation() {

  console.log('Getting current location');
  const result =
    execSync('/usr/libexec/geoclue-2.0/demos/where-am-i -t 6')
    .toString();

  const obj = Object.fromEntries(
    result.split('\n').map( line => line.split(':').map(k => k.trim()))
  );
  if (!obj['Latitude']) {
    throw new Error('Could not determine current location');
  }

  return [obj['Latitude'], obj['Longitude']].map(parseFloat);

}

function calculateDistance(lat1, lng1, lat2, lng2) {

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c;

  return distance*1000;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function wait(ms) {

  return new Promise(res => setTimeout(res, ms));

}

function humanDistance(inp) {

  if (inp < 1000) return inp + 'm';
  return (inp/1000) + 'km';

}

async function retry(cb, times = 3, delay = 1000) {

  try{
    return await cb();
  } catch (err) {

    if (times===0) {
      throw err;
    } else {
      console.warn('Function failed with error %s. Trying again in %s seconds', err, delay/1000)
      await wait(delay);
      return retry(cb, times-1, delay);
    }

  }

}
