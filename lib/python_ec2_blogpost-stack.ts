import * as cdk from 'aws-cdk-lib';
import { readFileSync } from 'fs';
import { Construct } from 'constructs';

import { Vpc, SubnetType, Peer, Port, AmazonLinuxGeneration, 
  AmazonLinuxCpuType, Instance, SecurityGroup, AmazonLinuxImage,
  InstanceClass, InstanceSize, InstanceType
} from 'aws-cdk-lib/aws-ec2';

import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Repository } from 'aws-cdk-lib/aws-codecommit';
import { Pipeline, Artifact } from 'aws-cdk-lib/aws-codepipeline';
import { CodeCommitSourceAction, CodeBuildAction, CodeDeployServerDeployAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { PipelineProject, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { ServerDeploymentGroup, ServerApplication, InstanceTagSet } from 'aws-cdk-lib/aws-codedeploy';

export class PythonEc2BlogpostStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IAM
    // Role that will be attached to the EC2 instance so it can be 
    // managed by AWS SSM
    const webServerRole = new Role(this, "ec2Role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
    // IAM policy attachment to allow access to
    webServerRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );
    webServerRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonEC2RoleforAWSCodeDeploy")
    );

    // VPC
    // This VPC has 3 public subnets, and that's it
    const vpc = new Vpc(this, 'main_vpc',{
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'pub01',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'pub02',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'pub03',
          subnetType: SubnetType.PUBLIC,
        }
      ]
    });
    // Security Groups
    // This SG will only allow HTTP traffic to the Web server
    const webSg = new SecurityGroup(this, 'web_sg',{
      vpc,
      description: "Allows Inbound HTTP traffic to the web server.",
      allowAllOutbound: true,
    });
    webSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80)
    );
    
    // EC2 Instance
    // This is the Python Web server that we will be using
    // Get the latest AmazonLinux 2 AMI for the given region
    const ami = new AmazonLinuxImage({
      generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: AmazonLinuxCpuType.X86_64,
    });
    // The actual Web EC2 Instance for the web server
    const webServer = new Instance(this, 'web_server',{
      vpc,
      instanceType: InstanceType.of(
        InstanceClass.T3,
        InstanceSize.MICRO,
      ),
      machineImage: ami,
      securityGroup: webSg,
      role: webServerRole,
    });
    // Userdata - used for bootstrapping
    const webSGUserData = readFileSync('./assets/configure_amz_linux_sample_app.sh','utf-8');
    webServer.addUserData(webSGUserData);
    // Tag the instance
    cdk.Tags.of(webServer).add('application_name','PYTHONWEB')
    cdk.Tags.of(webServer).add('STAGE','PROD')
    
    // Pipeline stuff
    // CodeCommit - This is where I store code
    const codeRepo = new Repository(this, 'code_repo',{
      repositoryName: 'python_app',
      description: 'This is the repository for the SampleApp python application.'
    });
    // CodePipeline
    const pipeline = new Pipeline(this, 'python_web_pipeline',{
      pipelineName: 'PythonWebApp',
      crossAccountKeys: false, // solves the encrypted bucket issue
    });
    // STAGES
    // Source Stage
    const sourceStage = pipeline.addStage({
      stageName: 'Source',
    })
    // Build Stage
    const buildStage = pipeline.addStage({
      stageName: 'Build',
    })
    // Deploy Stage
    const deployStage = pipeline.addStage({
      stageName: 'Deploy',
    })

    // Add some action
    // Source action
    const sourceOutput = new Artifact();
    const sourceAction = new CodeCommitSourceAction({
      branch: 'main',
      actionName: 'CodeCommit',
      repository: codeRepo,
      output: sourceOutput
    });
    sourceStage.addAction(sourceAction);
    // Build Action
    const pythonTestProject = new PipelineProject(this, 'pythonTestProject',{
      environment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_3
      }
    });
    const pythonTestOutput = new Artifact();
    const pythonTestAction = new CodeBuildAction({
      actionName: 'TestPython',
      project: pythonTestProject,
      input: sourceOutput,
      outputs: [pythonTestOutput]
    });
    buildStage.addAction(pythonTestAction);

    // Deploy Actions
    const pythonDeployApplication = new ServerApplication(this,"python_deploy_application",{
      applicationName: 'PythonWebApp'
    });
    // Deployment group
    const pythonServerDeploymentGroup = new ServerDeploymentGroup(this,'PythonAppDeployGroup',{
      application: pythonDeployApplication,
      deploymentGroupName: 'PythonAppDeploymentGroup',
      installAgent: true,
      ec2InstanceTags: new InstanceTagSet(
      {
        'application_name': ['PYTHONWEB'],
        'STAGE':['PROD', 'STAGE']
      }
      )
    });
    const pythonDeployAction = new CodeDeployServerDeployAction({
      actionName: 'PythonAppDeployment',
      input: sourceOutput,
      deploymentGroup: pythonServerDeploymentGroup,
    });
    deployStage.addAction(pythonDeployAction);
  }
}
