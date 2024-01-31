"use strict";

const AWS = require("aws-sdk");
const axios = require("axios");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const baseUrl = "https://devapi.locxre.com/api";
const tableName = "customers-dev";

const credentials = {
  email: "administrador@locximoveis.com.br",
  password: "TiAdm@D20M01A24*#!",
};

module.exports.action = async (event) => {
  try {
    const { action, customer: customerName } = event;
    const loginUrl = `${baseUrl}/auth`;
    const actionUrl = `${baseUrl}/${action}`;

    const params = {
      TableName: tableName,
    };

    const { Items: customers } = await dynamoDB.scan(params).promise();

    if (!customers) {
      throw new Error(`Customers not found.`);
    }

    customers.forEach(async (customer) => {
      if (!customer) {
        throw new Error(`Customer ${customerName} not found.`);
      }

      const loginResponse = await axios.post(loginUrl, credentials, {
        headers: {
          Customer: customer.Id,
        },
      });

      if (loginResponse.status === 200) {
        const accessToken = loginResponse.data.data.accessToken;
        const actionResponse = await axios.get(actionUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Customer: customer.Id,
          },
        });

        if (actionResponse.status != 200) {
          throw new Error(
            `Action error status: ${actionResponse.status}, customer ${customer.Name}`
          );
        }
      } else {
        throw new Error(`Login error status: ${loginResponse.status}`);
      }
    });
    return {
      statusCode: 200,
      data: `successfully! action: ${action}`,
    };
  } catch (error) {
    return {
      statusCode: 500,
      data: error.message,
    };
  }
};
