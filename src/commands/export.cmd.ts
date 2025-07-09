import {boolean, command, string} from '@drizzle-team/brocli';
import prompts, {type Choice} from 'prompts';
import {logger} from '../cli';
import {ApplicationsService, EventApIsService, ApplicationDomainsService} from '@solace-labs/ep-openapi-node';
import {writeOutput} from '../utils';

export const exportCmd = command({
  name: 'export',
  options: {
    format: string().enum('json', 'yaml').required(),
    output: string().alias('out').desc('Path to the output file (including filename)').required(),
    asyncApiVersion: string().enum('2.0.0', '2.2.0', '2.5.0'),
    includedExtensions: string().enum('all', 'parent', 'version', 'none'),
    shared: boolean().desc('Select shared Event API (only applicate for Event APIs)').default(false),
    applicationDomain: string().desc('ID of the desired application domain'),
    schemaSource: string().enum('application', 'event_api').desc('Source of the schema (e.g. application, event_api)'),
    application: string().desc(
      'ID of the desired application. Will only be applied when --schemaSource is application',
    ),
    applicationVersion: string().desc(
      'Version ID of the desired application. Will only be applied when --schemaSource is application',
    ),
    eventApi: string().desc('ID of the desired Event API. Will only be applied when --schemaSource is event_api'),
    eventApiVersion: string().desc(
      'Version ID of the desired Event API. Will only be applied when --schemaSource is event_api',
    ),
  },
  async handler(options) {
    let params = {
      application_domain: options.applicationDomain,
      schemaSource: options.schemaSource,
      application: {
        id: options.application,
        versionId: options.applicationVersion,
      } as {id: string | undefined; versionId: string | undefined},
      eventApi: {
        id: options.eventApi,
        versionId: options.eventApiVersion,
      } as {id: string | undefined; versionId: string | undefined},
    };
    if (!options.applicationDomain) {
      // 1. Get Application Domains
      const ApplicationDomains = await ApplicationDomainsService.getApplicationDomains({});
      if (!ApplicationDomains.data) {
        return logger.error('No application domains found');
      }
      logger.debug(
        'Retrieved ' + ApplicationDomains.meta?.pagination?.count + ' application domains from Event Portal',
        ApplicationDomains.meta,
      );

      // 2. Select an Application Domain
      const APPLICATION_DOMAIN_CHOICES: Choice[] = ApplicationDomains.data.map(appDomain => ({
        title: appDomain.name,
        value: appDomain.id,
        description: appDomain.description,
      }));
      if (APPLICATION_DOMAIN_CHOICES.length === 0) {
        return logger.info('No application domains found', {choices: APPLICATION_DOMAIN_CHOICES});
      }
      const {application_domain} = await prompts(
        [
          {
            type: 'autocomplete',
            name: 'application_domain',
            message: 'Select an application domain',
            suggest: async (input: string, choices: Choice[]) => {
              return choices.filter(choice => choice.title.toLowerCase().includes(input.toLowerCase()));
            },
            choices: APPLICATION_DOMAIN_CHOICES,
          },
        ],
        {
          onCancel: () => {
            logger.warn("You can't exit the selection");
            process.exit(0);
          },
        },
      );
      logger.debug(
        'Selected application domain: ' +
          APPLICATION_DOMAIN_CHOICES.find(choice => choice.value === application_domain)?.title,
        {id: application_domain},
      );
      params.application_domain = application_domain;
    } else logger.debug('Using application domain provided by flag.', {application_domain: options.applicationDomain});
    if (!params.application_domain) {
      return logger.error('No application domain specified', {application_domain: params.application_domain});
    }

    // 3. Choose between Application or Event API
    console.log(options);
    if (!options.schemaSource) {
      const SCHEMA_SOURCE_OPTIONS: Choice[] = [
        {title: 'Application', value: 'application'},
        {title: 'Event API', value: 'event_api'},
      ];
      const {schema_source} = await prompts(
        {
          type: 'select',
          name: 'schema_source',
          message: 'Where do you want to export the AsyncAPI schema from?',
          choices: SCHEMA_SOURCE_OPTIONS,
        },
        {
          onCancel: handleRequiredPromptCancellation,
        },
      );
      logger.debug(
        'Selected schema source: ' + SCHEMA_SOURCE_OPTIONS.find(choice => choice.value === schema_source)?.title,
        {source: schema_source},
      );
      params.schemaSource = schema_source;
    } else logger.debug('Using schema source provided by flag.', {schemaSource: options.schemaSource});
    if (!params.schemaSource) {
      return logger.error('No schema source specified', {schema_source: params.schemaSource});
    }

    // 4. Retrieve AsyncAPI Specification
    let asyncApiSchema: string;
    switch (params.schemaSource) {
      case 'application':
        // 4.1 Retrieve applications for the selected application domain
        logger.debug('Retrieving applications for application domain', {application_domain: params.application_domain});

        if (!params.application.id) {
          const Applications = await ApplicationsService.getApplications({
            applicationDomainId: params.application_domain,
          });
          if (!Applications.data) {
            return logger.error('Failed to retrieve applications for application domain', {
              application_domain: params.application_domain,
            });
          }
          logger.debug('Retrieved ' + Applications.meta?.pagination?.count + ' applications from Event Portal', {
            application_domain: params.application_domain,
            meta: Applications.meta,
          });

          const ApplicationChoices: Choice[] = Applications.data.map(app => ({
            title: app.name,
            value: app.id,
          }));
          if (ApplicationChoices.length === 0) {
            return logger.info('No applications found', {choices: ApplicationChoices});
          }
          const {application} = await prompts(
            {
              type: 'select',
              name: 'application',
              message: 'Select an application',
              choices: ApplicationChoices,
            },
            {
              onCancel: handleRequiredPromptCancellation,
            },
          );
          logger.debug(
            'Selected application: ' + ApplicationChoices.find(choice => choice.value === application)?.title,
            {id: application, application_domain: params.application_domain},
          );
          params.application.id = application;
        } else logger.debug('Using application provided by flag.', {application: params.application});
        if (!params.application || !params.application.id) {
          return logger.error('No application is specified', {application: params.application});
        }

        // 4.2 Retrieve available versions for the selected application
        if (!options.applicationVersion) {
          const ApplicationVersions = await ApplicationsService.getApplicationVersions({
            applicationIds: [params.application.id],
          });
          if (!ApplicationVersions.data) {
            return logger.error('Failed to retrieve application versions', {application: [params.application.id]});
          }

          const ApplicationVersionChoices: Choice[] = ApplicationVersions.data.map(version => ({
            title: version.version,
            value: version.id,
            description: version.description,
          }));
          if (ApplicationVersionChoices.length === 0) {
            return logger.info('No application versions found', {choices: ApplicationVersionChoices});
          }

          const {application_version} = await prompts(
            {
              type: 'select',
              name: 'application_version',
              message: 'Select an application version to export',
              choices: ApplicationVersionChoices,
            },
            {onCancel: handleRequiredPromptCancellation},
          );
          logger.debug(
            'Selected application version: ' +
              ApplicationVersionChoices.find(choice => choice.value === application_version)?.title,
            {
              id: application_version,
              application_domain: params.application_domain,
              application: params.application.id,
            },
          );
          params.application.versionId = application_version;
        } else logger.debug('Using verion ID for application provided by flag.', {application: params.application});
        if (!params.application || !params.application.versionId) {
          return logger.error('No verion ID for the application is specified', {application: params.application});
        }

        const ApplicationAsyncApiOptions = {
          applicationVersionId: params.application.versionId,
          format: options.format,
          asyncApiVersion: options.asyncApiVersion,
          includedExtensions: options.includedExtensions,
        };
        logger.debug('Retrieving AsyncAPI schema for application version', {
          ...ApplicationAsyncApiOptions,
          application: params.application.id,
        });
        asyncApiSchema = await ApplicationsService.getAsyncApiForApplicationVersion(ApplicationAsyncApiOptions);
        logger.debug('Retrieved AsyncAPI schema for application version', {
          ...ApplicationAsyncApiOptions,
          application: params.application.id,
        });
        break;

      case 'event_api':
        // 4.1 Retrieve Event APIs for the selected application domain
        if (!options.eventApi) {
          logger.debug('Retrieving Event APIs for application domain', {application_domain: params.application_domain});
          const EventApis = await EventApIsService.getEventApis({
            applicationDomainIds: [params.application_domain as string],
            shared: options.shared,
          });
          if (!EventApis.data) {
            return logger.error('Failed to retrieve Event APIs for application domain', {
              application_domain: params.application_domain,
              shared: options.shared,
            });
          }

          const EventApiChoices: Choice[] = EventApis.data.map(eventApi => ({
            title: eventApi.name || (eventApi.id as string),
            value: eventApi.id,
          }));
          if (EventApiChoices.length === 0) {
            return logger.info('No Event APIs found for application domain', {
              application_domain: params.application_domain,
              shared: options.shared,
            });
          }
          const {event_api} = await prompts(
            {
              type: 'select',
              name: 'event_api',
              message: 'Select an Event API',
              choices: EventApiChoices,
            },
            {
              onCancel: handleRequiredPromptCancellation,
            },
          );
          logger.debug('Selected Event API: ' + EventApiChoices.find(choice => choice.value === event_api)?.title, {
            id: event_api,
            application_domain: params.application_domain,
          });
          params.eventApi.id = event_api;
        } else logger.debug('Using Event API provided by flag.', {eventApi: options.eventApi});
        if (!params.eventApi.id) {
          return logger.error('No Event API ID specified', {eventApi: params.eventApi});
        }

        // Choose an Event API Version
        if (!options.eventApiVersion) {
          const TargetEventApiVersions = await EventApIsService.getEventApiVersions({
            eventApiIds: [params.eventApi.id],
          });
          if (!TargetEventApiVersions.data) {
            return logger.error('Failed to retrieve Event API versions', {eventApi: params.eventApi});
          }

          const TargetEventApiVersionChoices: Choice[] = TargetEventApiVersions.data.map(version => ({
            title: version.version ?? '',
            value: version.id,
            description: version.description,
          }));
          if (TargetEventApiVersionChoices.length === 0) {
            return logger.info('No Event API versions found', {eventApi: params.eventApi});
          }
          const {event_api_version} = await prompts(
            {
              type: 'select',
              name: 'event_api_version',
              message: 'Select an Event API version to export',
              choices: TargetEventApiVersionChoices,
            },
            {onCancel: handleRequiredPromptCancellation},
          );
          logger.debug(
            'Selected Event API version: ' +
              TargetEventApiVersionChoices.find(choice => choice.value === event_api_version)?.title,
            {
              id: event_api_version,
              application_domain: params.application_domain,
              eventApi: params.eventApi,
            },
          );
          params.eventApi.versionId = event_api_version;
        } else logger.debug('Using Event API Version ID provided by flag', {eventApiVersion: options.eventApiVersion});
        if (!params.eventApi.versionId) {
          return logger.info('No Event API Version ID specified', {eventApi: params.eventApi});
        }

        const EventApiAsyncApiOptions = {
          eventApiVersionId: params.eventApi.versionId,
          format: options.format,
          asyncApiVersion: options.asyncApiVersion,
          includedExtensions: options.includedExtensions,
        };
        logger.debug('Retrieving AsyncAPI schema for event API version', EventApiAsyncApiOptions);
        asyncApiSchema = await EventApIsService.getAsyncApiForEventApiVersion(EventApiAsyncApiOptions);
        logger.debug('Retrieved AsyncAPI schema for event API version', EventApiAsyncApiOptions);
        break;

      default:
        return (logger.error('Invalid schema source selected: ' + params.schemaSource), {source: params.schemaSource});
    }

    writeOutput(options.format === 'json' ? JSON.stringify(asyncApiSchema) : String(asyncApiSchema), options.output);
  },
});

function handleRequiredPromptCancellation() {
  logger.warn("You can't exit the selection");
  process.exit(0);
}
