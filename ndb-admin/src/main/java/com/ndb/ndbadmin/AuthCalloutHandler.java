package com.ndb.ndbadmin;

import io.nats.client.Connection;
import io.nats.jwt.*;
import io.nats.nkey.NKey;
import io.nats.service.ServiceMessage;
import io.nats.service.ServiceMessageHandler;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.security.GeneralSecurityException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.*;

import static io.nats.jwt.JwtUtils.getClaimBody;

public class AuthCalloutHandler implements ServiceMessageHandler {

  String ISSUER_NSEED = "SAAGOU6MXJRYJSH62XMZPAOKQKDKZ4MZP4GZPDXGALLXNN673RLETAUKHU";
  Map<String, AuthCalloutUser> NATS_USERS = new HashMap<>();
  NKey USER_SIGNING_NKEY;
  String USER_SIGNING_PUBLIC_KEY;
  Connection connection;

  public AuthCalloutHandler(Connection nc) {
    this.connection = nc;
    try {
      USER_SIGNING_NKEY = NKey.fromSeed(ISSUER_NSEED.toCharArray());
      USER_SIGNING_PUBLIC_KEY = new String(USER_SIGNING_NKEY.getPublicKey());
      AuthCalloutUser helloTokenUser = new AuthCalloutUser()
          .pub(new Permission().allow("test", "testSub"))
          .sub(new Permission().allow("testSub"));
      NATS_USERS.put("hello", helloTokenUser);

      AuthCalloutUser spiffeUser = new AuthCalloutUser()
          .pub(new Permission().allow(">"))
          .sub(new Permission().allow(">"));
      NATS_USERS.put("nats-client", spiffeUser);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  @Override
  public void onMessage(ServiceMessage serviceMessage) {
    System.out.println("[HANDLER] ===== AUTH CALLOUT REQUEST RECEIVED =====");
    System.out.println(serviceMessage.getData());

    String claimBody;
    Claim claim;
    try {
      claimBody = getClaimBody(serviceMessage.getData());
      claim = new Claim(claimBody);
    } catch (Exception e) {
      System.err.println("[HANDLER] Failed to get claim: " + e.getMessage());
      respondAuthCallout(serviceMessage, null, null, "Failed to parse request data");
      return;
    }

    AuthorizationRequest ar = claim.authorizationRequest;
    if (ar == null) {
      System.err.println("[HANDLER] Invalid Authorization Request Claim");
      respondAuthCallout(serviceMessage, null, null, "Invalid Authorization Request Claim");
      return;
    }
    System.out.println("[HANDLER] ConnectOpts User: " + ar.connectOpts.user);
    System.out.println("[HANDLER] ConnectOpts AuthToken: " + ar.connectOpts.authToken);

    // Step 1: Try certificate-based authentication (SPIFFE URI from SANs)
    String spiffeUri = extractSpiffeUriFromClaimBody(claimBody);

    if (spiffeUri != null) {
      System.out.println("[HANDLER] Extracted SPIFFE URI from certificate SANs: " + spiffeUri);

      String clientId = extractClientIdFromSpiffeUri(spiffeUri);
      if (clientId == null) {
        System.err.println("[HANDLER] Failed to extract client ID from SPIFFE URI: " + spiffeUri);
        respondAuthCallout(serviceMessage, ar, null, "Invalid SPIFFE URI format");
        return;
      }
      System.out.println("[HANDLER] Extracted client ID [" + clientId + "] from SPIFFE URI");

      AuthCalloutUser acUser = NATS_USERS.get(clientId);
      if (acUser == null) {
        System.err.println("[HANDLER] No user found for clientId: " + clientId);
        respondAuthCallout(serviceMessage, ar, null, "No user found for client ID: " + clientId);
        return;
      }

      System.out.println("[HANDLER] Authenticated user: " + clientId + " (method: CERTIFICATE_SPIFFE)");

      try {
        UserClaim uc = new UserClaim().pub(acUser.pub).sub(acUser.sub).resp(acUser.resp);
        String userJwt = new ClaimIssuer().aud("NDB").name(clientId)
            .iss(USER_SIGNING_PUBLIC_KEY).sub(ar.userNkey).nats(uc).issueJwt(USER_SIGNING_NKEY);
        respondAuthCallout(serviceMessage, ar, userJwt, null);
      } catch (Exception e) {
        System.err.println("[HANDLER] Error issuing JWT: " + e.getMessage());
        e.printStackTrace();
      }
      return;
    }

    // Step 2: Fall back to authToken (existing workflow)
    System.out.println("[HANDLER] No certificate/SPIFFE URI found, falling back to authToken workflow");

    if (ar.connectOpts.authToken == null || ar.connectOpts.authToken.isEmpty()) {
      System.err.println("[HANDLER] No Auth Token found");
      respondAuthCallout(serviceMessage, ar, null, "No Auth Token found");
      return;
    }

    AuthCalloutUser acUser = NATS_USERS.get(ar.connectOpts.authToken);
    if (acUser == null) {
      System.err.println("[HANDLER] No user found for authToken: " + ar.connectOpts.authToken);
      respondAuthCallout(serviceMessage, ar, null, "Invalid auth token");
      return;
    }

    System.out.println("[HANDLER] Authenticated user: " + ar.connectOpts.authToken + " (method: AUTH_TOKEN)");

    try {
      UserClaim uc = new UserClaim().pub(acUser.pub).sub(acUser.sub).resp(acUser.resp);
      String userJwt = new ClaimIssuer().aud("NDB").name(ar.connectOpts.user)
          .iss(USER_SIGNING_PUBLIC_KEY).sub(ar.userNkey).nats(uc).issueJwt(USER_SIGNING_NKEY);
      respondAuthCallout(serviceMessage, ar, userJwt, null);
    } catch (Exception e) {
      System.err.println("[HANDLER] Error issuing JWT: " + e.getMessage());
      e.printStackTrace();
    }
  }

  private String extractSpiffeUriFromClaimBody(String claimBody) {
    try {
      String searchStart = "-----BEGIN CERTIFICATE-----";
      String searchEnd = "-----END CERTIFICATE-----";

      int startIdx = claimBody.indexOf(searchStart);
      if (startIdx == -1) {
        System.out.println("[HANDLER] No certificate found in claim body");
        return null;
      }

      int endIdx = claimBody.indexOf(searchEnd, startIdx);
      if (endIdx == -1) {
        System.out.println("[HANDLER] Incomplete certificate in claim body");
        return null;
      }

      String pemRaw = claimBody.substring(startIdx, endIdx + searchEnd.length());
      String pem = pemRaw.replace("\\n", "\n");

      System.out.println("[HANDLER] Found certificate PEM, parsing...");

      CertificateFactory cf = CertificateFactory.getInstance("X.509");
      X509Certificate cert = (X509Certificate) cf.generateCertificate(
          new ByteArrayInputStream(pem.getBytes()));

      System.out.println("[HANDLER] Certificate Subject: " + cert.getSubjectX500Principal().getName());

      Collection<List<?>> sans = cert.getSubjectAlternativeNames();
      if (sans == null) {
        System.out.println("[HANDLER] No SANs found in certificate");
        return null;
      }

      for (List<?> san : sans) {
        Integer type = (Integer) san.get(0);
        Object value = san.get(1);
        System.out.println("[HANDLER] SAN type=" + type + " value=" + value);

        if (type == 6 && value instanceof String) {
          String uri = (String) value;
          if (uri.startsWith("spiffe://")) {
            System.out.println("[HANDLER] Found SPIFFE URI in certificate SANs: " + uri);
            return uri;
          }
        }
      }

      System.out.println("[HANDLER] No SPIFFE URI found in certificate SANs");
      return null;

    } catch (Exception e) {
      System.err.println("[HANDLER] Error parsing certificate from claim: " + e.getMessage());
      e.printStackTrace();
      return null;
    }
  }


  private String extractClientIdFromSpiffeUri(String spiffeUri) {
    try {
      URI uri = URI.create(spiffeUri);
      String path = uri.getPath();
      if (path == null || path.isEmpty()) {
        System.out.println("[HANDLER] SPIFFE URI has no path: " + spiffeUri);
        return null;
      }

      String[] segments = path.split("/");
      // Path "/workload_type/client_id" splits into ["", "workload_type", "client_id"]
      if (segments.length < 3) {
        System.out.println("[HANDLER] SPIFFE URI path does not contain enough segments: " + spiffeUri);
        return null;
      }

      String workloadType = segments[1];
      String clientId = segments[2];

      if (!"spire-agent".equals(workloadType) && !"db-server".equals(workloadType)) {
        System.out.println("[HANDLER] Unknown workload type [" + workloadType + "] in SPIFFE URI: " + spiffeUri);
        return null;
      }

      if (clientId.isEmpty()) {
        System.out.println("[HANDLER] Empty client ID in SPIFFE URI: " + spiffeUri);
        return null;
      }

      return clientId;
    } catch (IllegalArgumentException e) {
      System.err.println("[HANDLER] Malformed SPIFFE URI: " + spiffeUri);
      e.printStackTrace();
      return null;
    }
  }

  private void respondAuthCallout(ServiceMessage smsg, AuthorizationRequest ar, String userJwt, String error) {
    try {
      if (userJwt != null) {
        AuthorizationResponse response = new AuthorizationResponse().jwt(userJwt).error(error);
        String jwt = new ClaimIssuer()
            .aud(ar.serverId.id)
            .iss(USER_SIGNING_PUBLIC_KEY)
            .sub(ar.userNkey)
            .nats(response)
            .issueJwt(USER_SIGNING_NKEY);

        System.out.println("[HANDLER] Auth Resp JWT : " + getClaimBody(jwt));
        smsg.respond(connection, jwt);
      } else {
        System.out.println("[HANDLER] Auth Resp ERR : " + error);
        smsg.respond(connection, "");
      }
    } catch (Exception e) {
      System.err.println("[HANDLER] Error responding: " + e.getMessage());
      e.printStackTrace();
    }
  }
}
