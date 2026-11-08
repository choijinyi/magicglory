import {createClient} from '@libsql/client/web';

function result(value){
 return {success:true,results:value.rows.map(row=>Object.fromEntries(value.columns.map((name,index)=>[name,row[index]]))),meta:{changes:value.rowsAffected,last_row_id:Number(value.lastInsertRowid||0)}};
}

export function createTursoDatabase(environment=process.env){
 if(!environment.TURSO_DATABASE_URL||!environment.TURSO_AUTH_TOKEN)throw new Error('Turso database configuration is missing');
 const client=createClient({url:environment.TURSO_DATABASE_URL,authToken:environment.TURSO_AUTH_TOKEN,intMode:'number'});
 function prepare(sql){
  let args=[];
  return {sql,get args(){return args;},bind(...values){args=values;return this;},async first(){return result(await client.execute({sql,args})).results[0]||null;},async all(){return result(await client.execute({sql,args}));},async run(){return result(await client.execute({sql,args}));}};
 }
 return {prepare,async batch(statements){return (await client.batch(statements.map(statement=>({sql:statement.sql,args:statement.args})),'write')).map(result);},close(){client.close();}};
}
