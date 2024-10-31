import snowflake from 'snowflake-sdk';

export async function createConnection() {
  console.log('Attempting to create Snowflake connection...');
  console.log('Snowflake Account:', process.env.SNOWFLAKE_ACCOUNT);
  console.log('Snowflake Username:', process.env.SNOWFLAKE_USER);
  console.log('Snowflake Database:', process.env.SNOWFLAKE_DATABASE);
  console.log('Snowflake Schema:', process.env.SNOWFLAKE_SCHEMA);
  console.log('Snowflake Warehouse:', process.env.SNOWFLAKE_WAREHOUSE);
  console.log('Snowflake Role:', process.env.SNOWFLAKE_ROLE);

  return new Promise<snowflake.Connection>((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USER,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
      role: process.env.SNOWFLAKE_ROLE,
    });

    connection.connect((err, conn) => {
      if (err) {
        console.error('Error connecting to Snowflake:', err);
        reject(err);
      } else {
        console.log('Successfully connected to Snowflake');
        conn.execute({
          sqlText: 'SELECT CURRENT_WAREHOUSE(), CURRENT_DATABASE(), CURRENT_SCHEMA(), CURRENT_ROLE()',
          complete: (err, stmt, rows) => {
            if (err) {
              console.error('Error executing test query:', err);
            } else {
              console.log('Current session details:', rows[0]);
            }
            resolve(conn);
          }
        });
      }
    });
  });
}
