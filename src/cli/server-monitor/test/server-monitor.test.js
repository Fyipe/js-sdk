process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'error';
process.env.API_URL = 'http://localhost:3002';

const chai = require('chai');
chai.use(require('chai-http'));

const request = chai.request.agent(process.env.API_URL);

const utils = require('./test-utils');
const expect = require('chai').expect;
const serverMonitor = require('../lib/api');

const user = require('./test-utils').user;
user.email = utils.generateRandomBusinessEmail();

let token, projectId, apiKey, monitorId;
const badProjectId = 'badProjectId',
    badApiKey = 'badApiKey';
const invalidProjectId = utils.generateRandomString();
const timeout = 5000,
    monitor = {
        name: 'New Monitor',
        type: 'server-monitor',
        data: {},
    };

describe('Server Monitor', function() {
    this.timeout(timeout + 1000);

    before(function(done) {
        this.timeout(30000);

        request
            .post('/user/signup')
            .send(user)
            .end(function(err, res) {
                const project = res.body.project;

                projectId = project._id;
                apiKey = project.apiKey;

                request
                    .post('/user/login')
                    .send({
                        email: user.email,
                        password: user.password,
                    })
                    .end(function(err, res) {
                        token = res.body.tokens.jwtAccessToken;
                        request
                            .post(`/monitor/${projectId}`)
                            .set('Authorization', `Basic ${token}`)
                            .send(monitor)
                            .end(function(err, res) {
                                expect(res).to.have.status(200);
                                expect(res.body).to.be.an('object');
                                expect(res.body).to.have.property('_id');
                                monitorId = res.body._id;
                                done();
                            });
                    });
            });
    });

    it('Should connect when project id, api key and monitor id are provided', done => {
        const monitor = serverMonitor({
            projectId,
            apiKey,
            monitorId,
        });

        monitor.start().then(job => {
            const stopJob = monitor.stop();

            expect(job).to.be.an('object');
            expect(stopJob).to.be.an('object');

            done();
        });
    });

    it('Should connect when project id, custom api url, api key and monitor id are provided', done => {
        const monitor = serverMonitor({
            projectId,
            apiUrl: 'http://localhost:3002',
            apiKey,
            monitorId,
        });

        monitor.start().then(job => {
            const stopJob = monitor.stop();

            expect(job).to.be.an('object');
            expect(stopJob).to.be.an('object');

            done();
        });
    });

    it('Should request for monitor id when only project id and api key are provided', done => {
        const monitor = serverMonitor({
            projectId,
            apiKey,
            monitorId: data => {
                const filteredMonitor = data.filter(
                    monitor => monitor._id === monitorId
                );

                if (filteredMonitor.length > 0) {
                    return monitorId;
                }
            },
        });

        monitor.start().then(job => {
            const stopJob = monitor.stop();

            expect(job).to.be.an('object');
            expect(stopJob).to.be.an('object');

            done();
        });
    });

    it('Should disconnect when project id is invalid', done => {
        const monitor = serverMonitor({
            projectId: invalidProjectId,
            apiKey: badApiKey,
        });

        monitor.start().then(job => {
            const stopJob = monitor.stop();

            expect(job).to.be.an('object');
            expect(job).to.haveOwnProperty('message');
            expect(job.message).to.equal('Project Id is not valid');
            expect(stopJob).to.equal(undefined);

            done();
        });
    });

    it('Should disconnect when project id or api key are incorrect', done => {
        const monitor = serverMonitor({
            projectId: badProjectId,
            apiKey: badApiKey,
        });

        monitor.start().then(job => {
            const stopJob = monitor.stop();

            expect(job).to.be.an('object');
            expect(job).to.haveOwnProperty('message');
            expect(job.message).to.equal(
                'No Project found with this API Key and Project ID.'
            );
            expect(stopJob).to.equal(undefined);

            done();
        });
    });

    it('Should disconnect when project id is correct and api key is incorrect', done => {
        const monitor = serverMonitor({
            projectId,
            apiKey: badApiKey,
        });

        monitor.start().then(job => {
            const stopJob = monitor.stop();

            expect(job).to.be.an('object');
            expect(job).to.haveOwnProperty('message');
            expect(job.message).to.equal(
                'No Project found with this API Key and Project ID.'
            );
            expect(stopJob).to.equal(undefined);

            done();
        });
    });

    it('Should disconnect when project id is incorrect and api key is correct', done => {
        const monitor = serverMonitor({
            projectId: badProjectId,
            apiKey,
        });

        monitor.start().then(job => {
            const stopJob = monitor.stop();

            expect(job).to.be.an('object');
            expect(job).to.haveOwnProperty('message');
            expect(job.message).to.equal(
                'No Project found with this API Key and Project ID.'
            );
            expect(stopJob).to.equal(undefined);

            done();
        });
    });

    it('Should disconnect when timeout provided is exceeded', done => {
        const monitor = serverMonitor({
            projectId,
            apiKey,
            monitorId,
            timeout,
        });

        monitor.start().then(job => {
            expect(job).to.be.an('object');
            expect(job).to.have.property('running');
            expect(job.running).to.equal(true);

            setTimeout(() => {
                expect(job.running).to.equal(false);

                done();
            }, timeout);
        });
    });
});
