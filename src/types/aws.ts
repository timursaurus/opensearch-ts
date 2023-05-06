import type { AwsCredentialIdentity, Credentials, MemoizedProvider } from "@aws-sdk/types";

export interface AwsSigv4SignerOptions {
  getCredentials?: () => Promise<AwsCredentialIdentity | Credentials>;
  region: string;
  service?: "es" | "aoss";
}

type AWSV3Provider = MemoizedProvider<AwsCredentialIdentity>;
type AWSV2Provider = Credentials;

export type DefaultAWSCredentialsProvider = AWSV3Provider | AWSV2Provider;
export type AWSProvider = AWSV3Provider & AWSV2Provider;
