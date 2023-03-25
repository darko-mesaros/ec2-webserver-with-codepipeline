# Blog post notes

- This should be multiple posts for sure (Chuck and Poopstomp)
- I wont be using keypairs, as I will use SSM for accessing the EC2 instance.
- Userdata file is going to be part of the CDK repo, and will be added directly to an EC2 instance. NO S3
- adding some unit tests with python unittest - TEST WORK - YAY
- pipenv wont run in codebuild in 'shell' form so we need to use `pipenv run`
- *NOTE:* The AWSEC2RoleforAWSCodeDeploy gives an EC2 instance access to ALL S3 buckets. Which is bad.
- Some managed policies have `service-role/` in front of their name, and that NEEDS to be included in `.fromAWSManagedPolicyName`.
- CodePipeline by defaults adds KMS keys which encrypt the bucket. Causing issues with CodeDeploy. We just need to set `crossAccount` to false
- How about we do a different SampleApp ?

## TODO
[x] - Figure out CodeDeploy permissions
[x] - Figure out WSGI location / app 
[x] - Installing the CodeDeploy agent
[x] - CodeDeploy does not do a good job creating services
[x] - Fix Python code so it can be tested as is.
  - Made this work, quite easy, no need to change the original file structure.
[x] - Switch to Github instead of CodeCommit
  - Need to add a step to explain that the oauth token needs to exist in Secrets Manager
  - How to generate an Oauth token as well?
  - Make sure to FORK FIRST then deploy - otherwise it fails
  - Explain that you need Webhook permission on GH Tokens
[-] - Fix CodeDeploy permission
  - Impossible as it stands right now, as I am unable to get the bucket name.
  to be able to grant read access to the EC2 Instance
  - There is a similar thing already out there: https://github.com/aws/aws-cdk/issues/10080
  - But this ^ does not seem to work.
  [ ] - Speak to the CDK team to see if there is thing.
  [x] - Make a Issue on Github: https://github.com/aws/aws-cdk/issues/24784
[-] - Split the template into multiple file.
  - This does not seem to work the way i think it does.
  


## RAW TODO TODO
- Instead of cloning fork the repo into your own GH
- Do not use CodeCommit, rather deploy via github
- Separate steps to add Appspec and BuildSpec - Separate step in the tutorial
- Github webhooks for CodePipline
- Secrets Manager Github token
- Revert changes to the Sample App, and figure out how Unit tests work
- add a step to introduce python unit tests
- Use tabs for codeblocks in Buildon.aws
- Figure the bucket name for assets and
- Remove BuildStep outputs artficat
- Can I get the S3 bucket name from the source artifact
- Split the stuff into different files

## FUTURE TODO
- Deployment pipeline for CDK
- NOT RELATED: Create an application that deletes buckets
