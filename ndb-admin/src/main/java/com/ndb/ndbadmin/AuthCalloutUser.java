package com.ndb.ndbadmin;


import io.nats.jwt.Permission;
import io.nats.jwt.ResponsePermission;


public class AuthCalloutUser {

  public Permission pub;
  public Permission sub;
  public ResponsePermission resp;


  public AuthCalloutUser pub(Permission pub) {
    this.pub = pub;
    return this;
  }


  public AuthCalloutUser sub(Permission sub) {
    this.sub = sub;
    return this;
  }


  public AuthCalloutUser resp(ResponsePermission resp) {
    this.resp = resp;
    return this;
  }
}
