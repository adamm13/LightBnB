const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
  port: 5432
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool.query(`
  SELECT * FROM users
  WHERE email = $1
  `,[email])
  .then(res => res.rows[0])
  .catch(error => console.log(error))
}
  /*
  let user;
  for (const userId in users) {
    user = users[userId];
    if (user.email.toLowerCase() === email.toLowerCase()) {
      break;
    } else {
      user = null;
    }
  }
  return Promise.resolve(user);
  */

exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool.query(`
  SELECT * FROM users
  WHERE id = $1
  `,[id])
  .then(res => res.rows[0])
  .catch(error => console.log(error))
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool.query(`
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `,[user.name, user.email, user.password]) 
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(`
  SELECT reservations.*, properties.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1 AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;
  `, [guest_id, limit])
  .then(res => res.rows)
  .catch(error => console.log(error))
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function(options, limit = 10) {
  //1
  const queryParams = [];
  //2
  let queryString = `
  SELECT properties.*, AVG(rating) AS average_rating
  FROM properties
  LEFT JOIN property_reviews 
  ON properties.id = property_id
  `;

  //3
  if (options.city) { //CITY
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  //3.1
  if (options.owner_id) { //OWNER_ID
    if (queryString.includes('WHERE')) {
      queryString += `AND`;
    } else {
      queryString += `WHERE`;
    }

    queryParams.push(Number(options.owner_id));
    queryString += `owner_id = $${queryParams.length} `;
  }

  //3.2
  if (options.minimum_price_per_night) { //MINIMUM_PRICE_PER_NIGHT
    if (queryString.includes('WHERE')) {
      queryString += `AND`;
    } else {
      queryString += `WHERE`;
    }

    queryParams.push(Number(options.minimum_price_per_night)); 
    queryString += `cost_per_night > ${queryParams.length} `;
  }

  //3.3
  if (options.maximum_price_per_night) { //MAXIMUM_PRICE_PER_NIGHT
    if (queryString.includes('WHERE')) {
      queryString += `AND`;
    } else {
      queryString += `WHERE`;
    }

    queryParams.push(Number(options.maximum_price_per_night));
    queryString += `cost_per_night < ${queryParams.length}`;
  }

  queryString += `
  GROUP BY properties.id
  `;

  //3.4
  if (options.minimum_rating) { //MINIMUM_RATING
    queryParams.push(Number(options.minimum_rating));
    queryString += `HAVING AVG(rating) >= ${queryParams.length} `;
  }

  //4
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  //5
  console.log(queryString, queryParams);
  
  //6
  return pool.query(queryString, queryParams)
    .then(res => {
      return res.rows;
    })
    .catch(err => {
      console.error('query error', err.stack);
      return null;
    });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
}
exports.addProperty = addProperty;
