const aws = require('aws-sdk');

aws.config.update({ region: process.env.AWS_REGION });
const dynamoDb = new aws.DynamoDB({ apiVersion: '2012-10-08' });

exports.handler = async (event) => {
  // Get connections from DB
  let connectionData;
  try {
    connectionData = await dynamoDb.scan({
      TableName: process.env.TABLE_NAME,
      ProjectionExpression: 'connectionId',
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  // Prepare POST calls
  const apiManagementApi = new aws.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
  });
  const postData = JSON.parse(event.body).data;
  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      await apiManagementApi.postToConnection({
        ConnectionId: connectionId.S,
        Data: postData,
      }).promise();
    } catch (e) {
      if (e.statusCode !== 410) {
        throw e;
      }

      // Remove invalid connections
      await dynamoDb.deleteItem({
        TableName: process.env.TABLE_NAME,
        Key: { connectionId },
      }).promise();
    }
  });

  // Await calls
  try {
    await Promise.all(postCalls);
    return { statusCode: 200, body: 'Message sent' };
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
};
