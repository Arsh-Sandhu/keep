import m, { vnode } from 'mithril';
import moment from 'moment';
import {Button, Select, TextField} from '../../src/app/components';
import {Contacts, KERI, Profile, Schema} from '../../src/app/services';
import approveRequest from '../../src/assets/img/approve-request.svg';
import loanApproved from '../../src/assets/img/loan-approved.svg';
import githubLogo from '../../src/assets/img/github-logo.svg';


const legalEntityEdges = {
  "d": "",
  "qvi": {
    "n": "",
    "s": Schema.QVICredentialSchema
  },
};

const roleEdges = {
  "d": "",
  "o": "AND",
  "le": {
    "n": "",
    "s": Schema.LECredentialSchema,
    "o": "NI2I"
  },
  "qvi": {
    "n": "",
    "s": Schema.QVICredentialSchema,
    "o": "I2I"
  }
};

const rules = {
  "d": "EDIai3Wkd-Z_4cezz9nYEcCK3KNH5saLvZoS_84JL6NU",
  "usageDisclaimer": "Usage of a valid Legal Entity vLEI Credential does not assert that the Legal Entity is trustworthy, honest, reputable in its business dealings, safe to do business with, or compliant with any laws.",
  "issuanceDisclaimer": "Issuance of a valid Legal Entity vLEI Credential only establishes that the information in the requirements in the Identity Verification section 6.3 of the Credential Governance Framework were met in accordance with the vLEI Ecosystem Governance Framework."
}

class IssueLegalEntityCredentialTask {
  constructor(config) {
    this._label = config.label;
    this._schema = config.schema;
    this.legalEntityCredentials = [];
    this._component = {
      view: (vnode) => {
        return <IssueLegalEntityCredential end={vnode.attrs.end} parent={this} />;
      },
    };
    this.currentState = 'issue-credential';
    this.loading = true;
  }

  set recipient(recp) {
    this._recipient = recp;
  }

  get recipient() {
    return this._recipient;
  }

  get schema() {
    return this._schema
  }

  set qvi(cred) {
    this._qvi = cred
  }

  get qvi() {
    return this._qvi;
  }

  get legalEntity() {
    return this._legalEntity
  }

  set legalEntity(cred) {
    this._legalEntity = cred;
  }

  get legalEntityCredentials() {
    return this._legalEntityCredentials
  }

  set legalEntityCredentials(creds) {
    this._legalEntityCredentials = creds;
  }

  set lei(cred) {
    this._lei = cred
  }

  get lei() {
    return this._lei;
  }

  set personLegalName(cred) {
    this._personLegalName = cred
  }

  get personLegalName() {
    return this._personLegalName;
  }

  set officialRole(cred) {
    this._officialRole = cred
  }

  get officialRole() {
    return this._officialRole;
  }

  set engagementContextRole(cred) {
    this._engagementContextRole = cred
  }

  get engagementContextRole() {
    return this._engagementContextRole;
  }

  get imgSrc() {
    return loanApproved;
  }

  get label() {
    return this._label;
  }

  get component() {
    return this._component;
  }
}

class IssueLegalEntityCredential {
  constructor(vnode) {
    this.contacts = [];

    Profile.loadIdentifiers().then(e => {
      vnode.attrs.parent.defaultAid = Profile.getDefaultAID("multi");
      KERI.listCredentials(vnode.attrs.parent.defaultAid.name, 'received')
          .then((credentials) => {
            let qvi = credentials.find((cred) => {
              return cred['sad']['s'] === Schema.QVICredentialSchema;
            });
            vnode.attrs.parent.qvi = qvi['sad']['d'];
          })
          .catch((err) => {
          });

      Contacts.requestList().then((contacts) => {
        KERI.listCredentials(vnode.attrs.parent.defaultAid.name, 'issued')
            .then((credentials) => {
              let creds = credentials.filter((cred) => {
                return cred['sad']['s'] === Schema.LECredentialSchema;
              });

              vnode.attrs.parent.leiMap = new Map();
              vnode.attrs.parent.legalEntityCredentials = creds.map((cred) => {
                let recipientAid = cred['sad']['a']['i']
                let lei = cred['sad']['a']['LEI'];
                let said = cred['sad']['d']
                let contact = Contacts.filterById(recipientAid);

                vnode.attrs.parent.leiMap[said] = lei;
                return {
                  value: said,
                  label: "Legal Entity vLEI issued to " + contact.alias,
                }
              })
              vnode.attrs.parent.loading = false;
            })
            .catch((err) => {
              console.log(err);
            });
      })

    })


  }

  oninit() {
    KERI.getContacts().then((contacts) => {
      this.contacts = contacts;
    });
  }

  get currentDate() {
    const now = moment();
    return now.format('M/D/YY');
  }

  get contactsSelect() {
    return [
      {
        label: '',
        value: null,
      },
      ...this.contacts.map((contact) => {
        return {
          label: contact.alias,
          value: contact.id,
        };
      }),
    ];
  }

  issueCredential(vnode) {
    let schema = vnode.attrs.parent.schema
    let data = {
      LEI: vnode.attrs.parent.lei
    }
    let edges = {};
    if (schema === Schema.LECredentialSchema) {
      edges = structuredClone(legalEntityEdges);
      edges.qvi.n = vnode.attrs.parent.qvi
    } else if (schema === Schema.OORCredentialSchema) {
      edges = structuredClone(roleEdges)
      edges.qvi.n = vnode.attrs.parent.qvi
      edges.le.n = vnode.attrs.parent.legalEntity
      data['personLegalName'] = vnode.attrs.parent.personLegalName
      data['officialRole'] = vnode.attrs.parent.officialRole
    } else if (schema === Schema.ECRCredentialSchema) {
      edges = structuredClone(roleEdges)
      edges.qvi.n = vnode.attrs.parent.qvi
      edges.le.n = vnode.attrs.parent.legalEntity
      data['personLegalName'] = vnode.attrs.parent.personLegalName
      data['engagementContextRole'] = vnode.attrs.parent.engagementContextRole
    }
    KERI.multisigIssueCredential(vnode.attrs.parent.defaultAid.name, {
      credentialData: data,
      recipient: vnode.attrs.parent.recipient.id,
      registry: vnode.attrs.parent.defaultAid.name,
      schema: schema,
      source: edges,
      rules: rules
    }).then(() => {
      vnode.attrs.parent.currentState = 'credential-issued';
    });
  }

  view(vnode) {
    return (
      <>
        {vnode.attrs.parent.loading && (
            <>
            <p>Loading...</p>
            </>
        )}
        {(vnode.attrs.parent.currentState === 'issue-credential' &&
            vnode.attrs.parent.schema === Schema.LECredentialSchema) && (
          <>
            <h3>Issue Legal Entity vLEI Credential</h3>
            <p className="p-tag">
              Ensure your Qualified vLEI Issuer vLEI Credential is selected to chain to the new Legal Entity Credential,
              select the proper recipient from your list of contacts and provide the LEI number for the recipient.
            </p>
            <p className="p-tag-bold">Your Qualified vLEI Issuer vLEI Credential</p>
            <TextField
                outlined
                fluid
                style={{margin: '0 5px 0 0'}}
                value={vnode.attrs.parent.qvi}
            />
            <p class="p-tag-bold">Legal Entity vLEI Credential Recipient</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 10px 0 0' }}
                value={vnode.attrs.parent.recipient.alias}
            />
            <p></p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                value={vnode.attrs.parent.recipient.id}
            />
            <p className="p-tag-bold">Enter the LEI:</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                oninput={(e) => {
                  vnode.attrs.parent.lei = e.target.value;
                }}
                value={vnode.attrs.parent.lei}
            />
            <div class="flex flex-justify-between" style={{ marginTop: '4rem' }}>
              <Button
                raised
                class="button--no-transform button--gray-dk button--big"
                label="Cancel"
                onclick={() => {
                  vnode.attrs.end();
                }}
              />
              <Button
                class="button--big button--no-transform"
                disabled={!vnode.attrs.parent.lei || !vnode.attrs.parent.qvi || !vnode.attrs.parent.recipient}
                raised
                label="Preview"
                onclick={() => {
                  vnode.attrs.parent.currentState = 'review-credential';
                }}
              />
            </div>
          </>
        )}
        {(!vnode.attrs.parent.loading && vnode.attrs.parent.currentState === 'issue-credential' &&
            vnode.attrs.parent.schema === Schema.OORCredentialSchema) && (
          <>
            <h3>Issue Legal Official Organizational Role Entity vLEI Credential</h3>
            <p className="p-tag">
              Ensure your Qualified vLEI Issuer vLEI Credential is selected to chain to the new Legal Entity Official
              Organizational Role Credential, select the proper recipient from your list of contacts and provide the LEI,
              Person Legal Name and Official Organization Role for the recipient.
            </p>
            <p className="p-tag-bold">Your Qualified vLEI Issuer vLEI Credential</p>
            <TextField
                outlined
                fluid
                style={{margin: '0 5px 0 0'}}
                value={vnode.attrs.parent.qvi}
            />
            <p class="p-tag-bold">Legal Entity Official Organizational Role vLEI Credential Recipient</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 10px 0 0' }}
                value={vnode.attrs.parent.recipient.alias}
            />
            <p></p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                value={vnode.attrs.parent.recipient.id}
            />
            <p className="p-tag-bold">Select Legal Entity Credental Chain:</p>
            <Select
                style={{width: "100%"}}
                outlined
                options={vnode.attrs.parent.legalEntityCredentials}
                onchange={(said) => {
                  vnode.attrs.parent.lei = vnode.attrs.parent.leiMap[said];
                  vnode.attrs.parent.legalEntity = said;
                }}
            />
            <p className="p-tag-bold">Verify the LEI:</p>
            <TextField
                outlined
                disabled
                fluid
                style={{ margin: '0 0 0 0' }}
                oninput={(e) => {

                }}
                value={vnode.attrs.parent.lei}
            />
            <p className="p-tag-bold">Enter the Person Legal Name:</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                oninput={(e) => {
                  vnode.attrs.parent.personLegalName = e.target.value;
                }}
                value={vnode.attrs.parent.personLegalName}
            />
            <p className="p-tag-bold">Enter the Official Organizational Role:</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                oninput={(e) => {
                  vnode.attrs.parent.officialRole = e.target.value;
                }}
                value={vnode.attrs.parent.officialRole}
            />
            <div class="flex flex-justify-between" style={{ marginTop: '4rem' }}>
              <Button
                raised
                class="button--no-transform button--gray-dk button--big"
                label="Cancel"
                onclick={() => {
                  vnode.attrs.end();
                }}
              />
              <Button
                class="button--big button--no-transform"
                disabled={!vnode.attrs.parent.lei || !vnode.attrs.parent.qvi || !vnode.attrs.parent.recipient}
                raised
                label="Preview"
                onclick={() => {
                  vnode.attrs.parent.currentState = 'review-credential';
                }}
              />
            </div>
          </>
        )}
        {(!vnode.attrs.parent.loading && vnode.attrs.parent.currentState === 'issue-credential' &&
            vnode.attrs.parent.schema === Schema.ECRCredentialSchema) && (
          <>
            <h3>Issue Legal Engagement Context Role Entity vLEI Credential</h3>
            <p className="p-tag">
              Ensure your Qualified vLEI Issuer vLEI Credential is selected to chain to the new Legal Entity Official
              Organizational Role Credential, select the proper recipient from your list of contacts and provide the LEI,
              Person Legal Name and Engagement Context Role for the recipient.
            </p>
            <p className="p-tag-bold">Your Qualified vLEI Issuer vLEI Credential</p>
            <TextField
                outlined
                fluid
                style={{margin: '0 5px 0 0'}}
                value={vnode.attrs.parent.qvi}
            />
            <p class="p-tag-bold">Legal Entity Engagement Context Role vLEI Credential Recipient</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 10px 0 0' }}
                value={vnode.attrs.parent.recipient.alias}
            />
            <p></p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                value={vnode.attrs.parent.recipient.id}
            />
            <p className="p-tag-bold">Select Legal Entity Credental Chain:</p>
            <Select
                style={{width: "100%"}}
                outlined
                options={vnode.attrs.parent.legalEntityCredentials}
                onchange={(said) => {
                  vnode.attrs.parent.lei = vnode.attrs.parent.leiMap[said];
                  vnode.attrs.parent.legalEntity = said;
                }}
            />
            <p className="p-tag-bold">Verify the LEI:</p>
            <TextField
                outlined
                disabled
                fluid
                style={{ margin: '0 0 0 0' }}
                oninput={(e) => {

                }}
                value={vnode.attrs.parent.lei}
            />
            <p className="p-tag-bold">Enter the Person Legal Name:</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                oninput={(e) => {
                  vnode.attrs.parent.personLegalName = e.target.value;
                }}
                value={vnode.attrs.parent.personLegalName}
            />
            <p className="p-tag-bold">Enter the Engagement Context Role:</p>
            <TextField
                outlined
                fluid
                style={{ margin: '0 0 0 0' }}
                oninput={(e) => {
                  vnode.attrs.parent.engagementContextRole = e.target.value;
                }}
                value={vnode.attrs.parent.engagementContextRole}
            />
            <div class="flex flex-justify-between" style={{ marginTop: '4rem' }}>
              <Button
                raised
                class="button--no-transform button--gray-dk button--big"
                label="Cancel"
                onclick={() => {
                  vnode.attrs.end();
                }}
              />
              <Button
                class="button--big button--no-transform"
                disabled={!vnode.attrs.parent.lei || !vnode.attrs.parent.qvi || !vnode.attrs.parent.recipient}
                raised
                label="Preview"
                onclick={() => {
                  vnode.attrs.parent.currentState = 'review-credential';
                }}
              />
            </div>
          </>
        )}
        {vnode.attrs.parent.currentState === 'review-credential' && (
          <>
            <h3 style={{ marginBottom: '2rem' }}>Review Credential</h3>
            <p class="p-tag" style={{ fontSize: '20px' }}>
              Please review credential prior to issuing and make sure it is correct.
            </p>
            <div class="flex flex-justify-start" style={{ margin: '3rem 0 3rem 0' }}>
              <div class="flex" style={{ marginRight: '2rem', alignItems: 'center' }}>
                <img src={githubLogo} style={{ width: '100px', height: '100px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', margin: '.5rem 0' }}>{this.recipient}</h3>
                {/* <p class="p-tag" style={{ margin: '.5rem 0' }}>
                  QAR for VeriTech
                </p> */}
                <p class="p-tag" style={{ fontSize: '20px', margin: '.5rem 0' }}>
                  Issuing on {this.currentDate}
                </p>
              </div>
            </div>
            <p class="p-tag" style={{ fontSize: '20px' }}>
              Provenance Chain
            </p>
            <div class="flex" style={{ flexDirection: 'column' }}>
              <div class="flex" style={{ alignItems: 'center' }}>
                <div class="flex">
                  <img
                    src={githubLogo}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', marginRight: '1rem' }}
                  />
                  <p class="p-tag">
                    <b>
                      <u>ACME Corp.</u>
                    </b>{' '}
                    granting QAR credentials to{' '}
                    <b>
                      <u>{this.recipient}</u>
                    </b>{' '}
                    on 11/2/20
                  </p>
                </div>
              </div>
              <div></div>
              <div
                style={{ height: '30px', borderLeft: '1px solid black', marginLeft: '1.5rem', marginTop: '-15px' }}
              ></div>
              <div class="flex">
                <img
                  src={githubLogo}
                  style={{ width: '50px', height: '50px', borderRadius: '50%', marginRight: '1rem' }}
                />
                <p class="p-tag">
                  <b>
                    <u>GLEIF vLEI Credential to be issued on {this.currentDate}</u>
                  </b>
                </p>
              </div>
            </div>
            <div class="flex flex-justify-between" style={{ marginTop: '4rem' }}>
              <Button
                class="button--gray-dk button--big button--no-transform"
                raised
                label="Go Back"
                onclick={() => {
                  vnode.attrs.parent.currentState = 'issue-credential';
                }}
              />
              <Button
                class="button--big button--no-transform"
                raised
                label="Issue"
                onclick={() => {
                  this.issueCredential(vnode);
                }}
              />
            </div>
          </>
        )}
        {vnode.attrs.parent.currentState === 'credential-issued' && (
          <>
            <img src={approveRequest} style={{ width: '230px', margin: '1.5rem 0 2rem 0' }} />
            <h3>Credential Issued</h3>
            <div class="flex flex-justify-between" style={{ alignItems: 'center' }}>
              <p class="p-tag" style={{ fontSize: '20px' }}>
                Issued 1:23pm on 12/7/21
              </p>
            </div>
            <p class="p-tag">
              The issuance of Bob Smith's vLEI Credential is complete. The vLEI Credential is now in their credential
              wallet.
            </p>
            <div class="flex flex-justify-end" style={{ marginTop: '4rem' }}>
              <Button class="button--big button--no-transform" raised label="Close" onclick={vnode.attrs.end} />
            </div>
          </>
        )}
      </>
    );
  }
}

module.exports = IssueLegalEntityCredentialTask;
