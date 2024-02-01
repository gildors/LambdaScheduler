"use strict";

const axios = require("axios");
const aws = require("aws-sdk");

const dynamoDB = new aws.DynamoDB.DocumentClient();
const baseUrl = "https://devapi.locxre.com/api";
const tableName = "customers-dev";

const credentials = {
  email: "administrador@locximoveis.com.br",
  password: "TiAdm@D20M01A24*#!",
};

const login = async (customer, loginUrl) => {
  try {
    const loginResponse = await axios.post(loginUrl, credentials, {
      headers: {
        Customer: customer.Id,
      },
    });
    return loginResponse.data.data.accessToken;
  } catch (error) {
    throw new Error(`${customer.Name}: (login) ${error.message}`);
  }
};

const performAction = async (customer, actionUrl, accessToken) => {
  try {
    const actionResponse = await axios.get(actionUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Customer: customer.Id,
      },
    });

    if (actionResponse.status == 200)
      console.log(`${customer.Name}: (action) ${actionResponse.status}`);
  } catch (error) {
    throw new Error(`${customer.Name}: (action) ${actionResponse.status}`);
  }
};

module.exports.action = async (event) => {
  try {
    const { action, ignoreList } = event;
    const loginUrl = `${baseUrl}/auth`;
    const actionUrl = `${baseUrl}/${action}`;

    const params = {
      TableName: tableName,
    };

    const { Items: customers } = await dynamoDB.scan(params).promise();

    if (!customers || customers.length === 0) {
      throw new Error(`Customers not found.`);
    }

    const errors = [];

    await Promise.all(
      customers.map(async (customer) => {
        try {
          if (!customer) {
            throw new Error(`Customer ${customerName} not found.`);
          }

          if (ignoreList && ignoreList.includes(customer.Name)) {
            console.warn(`Ignoring customer ${customer.Name}`);
            return;
          }

          const accessToken = await login(customer, loginUrl);
          if (accessToken)
            await performAction(customer, actionUrl, accessToken);
        } catch (error) {
          errors.push(error.message);
        }
      })
    );

    if (errors.length > 0) {
      throw new Error(`${errors.join("; ")}`);
    }

    return {
      statusCode: 200,
      data: `Successfully! Action: ${action}`,
    };
  } catch (error) {
    return {
      statusCode: 500,
      data: error.message,
    };
  }
};
