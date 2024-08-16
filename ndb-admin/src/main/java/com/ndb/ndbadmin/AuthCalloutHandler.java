package com.ndb.ndbadmin;

import io.nats.client.Connection;
import io.nats.jwt.*;
import io.nats.nkey.NKey;
import io.nats.service.ServiceMessage;
import io.nats.service.ServiceMessageHandler;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.Map;

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
    } catch (Exception e) {
      throw new RuntimeException(e);
    }

  }

  @Override
  public void onMessage(ServiceMessage serviceMessage) {
    System.out.println(serviceMessage.getData());

    try {

      Claim claim = new Claim(getClaimBody(serviceMessage.getData()));
      System.out.println("[HANDLER] Claim-Request : " + claim.toJson());


      AuthorizationRequest ar = claim.authorizationRequest;
      if (ar == null) {
        System.err.println("Invalid Authorization Request Claim");
        return;
      }
      System.out.println("[HANDLER] Auth Request  : " + ar.toJson());

//     pcIam.validate(ar.connectOpts.jwt)
      AuthCalloutUser acUser = NATS_USERS.get(ar.connectOpts.authToken);
      if (acUser == null) {

        respond(serviceMessage, ar, null, "No user found");
        return;
      }


      UserClaim uc = new UserClaim().pub(acUser.pub).sub(acUser.sub).resp(acUser.resp);


      String userJwt = new ClaimIssuer().aud("NDB").name(ar.connectOpts.user)
          .iss(USER_SIGNING_PUBLIC_KEY).sub(ar.userNkey).nats(uc).issueJwt(USER_SIGNING_NKEY);


      respond(serviceMessage, ar, userJwt, null);
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  private void respond(ServiceMessage smsg, AuthorizationRequest ar, String userJwt, String error)
      throws GeneralSecurityException, IOException {


    AuthorizationResponse response = new AuthorizationResponse().jwt(userJwt).error(error);


    if (userJwt != null) {
      System.out.println("[HANDLER] Auth Resp JWT : " + getClaimBody(userJwt));
    } else {
      System.out.println("[HANDLER] Auth Resp ERR : " + response.toJson());
    }

    String jwt = new ClaimIssuer()
        .aud(ar.serverId.id)
        .iss(USER_SIGNING_PUBLIC_KEY)
        .sub(ar.userNkey)
        .nats(response)
        .issueJwt(USER_SIGNING_NKEY);


    System.out.println("[HANDLER] Claim-Response: " + getClaimBody(jwt));
    smsg.respond(connection, jwt);
  }
}
