const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2023-08-09";
const dataset = assertValue(process.env.NEXT_PUBLIC_SANITY_DATASET, "Missing environment variable: NEXT_PUBLIC_SANITY_DATASET");
const projectId = assertValue(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, "Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID");
const token = assertValue(process.env.NEXT_PUBLIC_SANITY_SECRET_TOKEN, "Missing environment variable: NEXT_PUBLIC_SANITY_SECRET_TOKEN");
const useCdn = false;
function assertValue(v, errorMessage) {
    if (v === undefined) {
        throw new Error(errorMessage);
    }
    return v;
}
import { createClient } from "@sanity/client";
export const client = createClient({
    apiVersion,
    dataset,
    projectId,
    useCdn,
    token,
});
