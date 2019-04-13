const aws = require('aws-sdk');

aws.config.update({ region: process.env.AWS_REGION });
const dynamoDb = new aws.DynamoDB({ apiVersion: '2012-10-08' });

exports.handler = async (event) => {
  if (event.requestContext.eventType === 'CONNECT') {
    try {
      await dynamoDb.putItem({
        TableName: process.env.TABLE_NAME,
        Item: { connectionId: { S: event.requestContext.connectionId } },
      }).promise();

      return { statusCode: 200, body: 'Connected' };
    } catch (e) {
      return { statusCode: 500, body: e.stack };
    }
  }

  if (event.requestContext.eventType === 'DISCONNECT') {
    try {
      await dynamoDb.deleteItem({
        TableName: process.env.TABLE_NAME,
        Key: { connectionId: { S: event.requestContext.connectionId } },
      }).promise();

      return { statusCode: 200, body: 'Disconnected' };
    } catch (e) {
      return { statusCode: 500, body: e.stack };
    }
  }

  return { statusCode: 400, body: 'Invalid event' };
};
