import axios from "axios";
import { logger } from "./logger";

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("7") || cleaned.startsWith("1"))
    return "254" + cleaned;
  return cleaned;
}

function makeTimestampAndPassword(shortcode: string, passkey: string): {
  timestamp: string;
  password: string;
} {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64",
  );
  return { timestamp, password };
}

async function getAccessToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64",
  );

  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${credentials}` } },
  );

  return response.data.access_token;
}

/**
 * Map M-Pesa ResultCode to our internal status strings.
 * Codes sourced from Safaricom Daraja documentation.
 */
export function mapResultCode(resultCode: string | number | null | undefined): "completed" | "cancelled" | "timeout" | "failed" | "pending" {
  const code = String(resultCode ?? "");
  const map: Record<string, "completed" | "cancelled" | "timeout" | "failed"> = {
    "0":    "completed",
    "1032": "cancelled",  // User cancelled
    "1037": "timeout",    // STK push timed out
    "1":    "failed",
    "2001": "failed",     // Wrong PIN
    "17":   "failed",     // Link expired
    "1001": "failed",     // Unable to lock subscriber
    "1019": "timeout",    // Transaction expired
    "1025": "failed",     // System internal error
    "2006": "failed",     // InsufficientFunds
  };
  return map[code] ?? "pending";
}

export interface StkQueryResult {
  status: "completed" | "cancelled" | "timeout" | "failed" | "pending";
  resultCode: string;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  mpesaTransactionDate?: string;
  mpesaPhoneNumber?: string;
  amount?: number;
  rawData?: Record<string, unknown>;
}

/**
 * Extract all CallbackMetadata items into a typed map.
 */
export function extractCallbackItems(items: Array<{ Name: string; Value: unknown }>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of items ?? []) {
    if (item.Name && item.Value !== undefined && item.Value !== null) {
      result[item.Name] = String(item.Value);
    }
  }
  return result;
}

/**
 * Query M-Pesa directly for the latest STK push status.
 * This is the primary way to detect cancellations when callback hasn't fired yet.
 */
export async function queryStkPushStatus(
  checkoutRequestId: string,
): Promise<{ success: boolean; data?: StkQueryResult }> {
  try {
    const accessToken = await getAccessToken();
    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey = process.env.MPESA_PASSKEY!;
    const { timestamp, password } = makeTimestampAndPassword(shortcode, passkey);

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const rawData = response.data as Record<string, unknown>;
    const { ResultCode, ResultDesc, CallbackMetadata } = rawData;
    const resultCode = String(ResultCode ?? "");
    const status = mapResultCode(resultCode);

    const items: Array<{ Name: string; Value: unknown }> =
      (CallbackMetadata as any)?.Item ?? [];
    const extracted = extractCallbackItems(items);

    logger.info(
      { checkoutRequestId, resultCode, status, extracted },
      "STK query response from M-Pesa",
    );

    return {
      success: true,
      data: {
        status,
        resultCode,
        resultDesc: String(ResultDesc ?? ""),
        mpesaReceiptNumber: extracted["MpesaReceiptNumber"],
        mpesaTransactionDate: extracted["TransactionDate"],
        mpesaPhoneNumber: extracted["PhoneNumber"],
        amount: extracted["Amount"] ? Number(extracted["Amount"]) : undefined,
        rawData,
      },
    };
  } catch (err: any) {
    const errBody = err?.response?.data;
    const errCode = String(errBody?.errorCode ?? errBody?.ResultCode ?? "");
    if (errCode) {
      const status = mapResultCode(errCode);
      logger.info(
        { checkoutRequestId, errCode, status },
        "STK query returned error code from M-Pesa",
      );
      return {
        success: true,
        data: {
          status,
          resultCode: errCode,
          resultDesc: String(errBody?.errorMessage ?? errBody?.ResultDesc ?? ""),
          rawData: errBody,
        },
      };
    }
    logger.warn({ err, checkoutRequestId }, "STK query failed, falling back to DB");
    return { success: false };
  }
}

export interface StkPushResult {
  CheckoutRequestID: string;
  MerchantRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export async function stkPush(
  phone: string,
  amount: number,
  accountRef: string,
  description: string,
): Promise<StkPushResult> {
  const accessToken = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const callbackUrl = process.env.MPESA_CALLBACK_URL!;
  const { timestamp, password } = makeTimestampAndPassword(shortcode, passkey);
  const formattedPhone = formatPhone(phone);

  logger.info({ phone: formattedPhone, amount, accountRef }, "Initiating STK push");

  const response = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: description,
    },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  return response.data as StkPushResult;
}
