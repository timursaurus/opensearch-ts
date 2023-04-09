import type { AwsCredentialIdentity } from "@aws-sdk/types";

export interface AwsSigv4SignerOptions {
  getCredentials?: () => Promise<AwsCredentialIdentity>;
  region: string;
  service?: "es" | "aoss";
}
