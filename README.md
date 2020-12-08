# Nest GatewayQL

## Description

[Nest GatewayQL](https://github.com/GatewayQL/nest-GatewayQL) is a microservices GraphQL gateway built on Nestjs.

## Installation

```bash
$ npm install
```

## Run on local/development env:

1. Copy and rename `.env.development.example` to `.env` (adjust database settings if not using default config)
2. Install dependencies `npm install`
3. Run `npm run build` (copy config/gateway.config.yml and config/system.config.yml to dist/config directory)
4. Run Postgres database on localhost, see also Run Postgres database using Docker-compose
5. Run `npm start`
6. Access the GraphQL gateway from browser `http://localhost:3000/graphql`
7. Access the admin GraphQL doc from browser `http://localhost:3000/admin`


## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Run Postgres database using Docker-compose
Make sure to set .env file for docker-compose environment var

Run using `docker-compose`
```bash
$ docker-compose -f docker-compose-postgres.yml up -d
```

Stopping using `docker-compose`
```bash
$ docker-compose -f docker-compose-postgres.yml down
```

## Run using Docker-compose including postgres
Make sure to set .env file for docker-compose environment var

Run using `docker-compose`
```bash
$ docker-compose up -d
```

Stopping using `docker-compose`
```bash
$ docker-compose down
```

## Test using Docker-compose
Run using `docker-compose`

1. Run test (build and run both node and mongo containers)
```bash
# run jest test using docker
$ docker-compose run app npm test
```
# run e2e test using docker
$ docker-compose run app npm run test:e2e
```
# run cov test using docker
$ docker-compose run app npm run test:cov
```

2. Remove running container
```bash
# stop nestjs-starter container
$ docker-compose down --remove-orphans
```
2. Remove running images
```bash
$ docker rmi -f nest-gatewayql
```

## Run using Docker
Run using `docker`

* Build app only
```bash
# Build nest-gatewayql
$ docker build -t nest-gatewayql .
```
* Run server
```bash
# run account-service using docker
$ docker run --name nest-gatewayql -p 3000:3000 -i nest-gatewayql npm start
```

2. Remove running container
```bash
# stop nestjs-starter container
$ docker rm -f nest-gatewayql
```
2. Remove running images
```bash
$ docker rmi -f nest-gatewayql
```

> Depends on installation, you may need to use `sudo`

## Support

Nest GatewayQL is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here]().

## Stay in touch

- Author - [Elky Bachtiar]()
- Website - [https://GatewayQL.com](https://gatewayql.com/)

## License

  Nest GatewayQL is [MIT licensed](LICENSE).
