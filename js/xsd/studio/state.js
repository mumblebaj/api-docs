const DEFAULT_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="note">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="to" type="xs:string"/>
        <xs:element name="from" type="xs:string"/>
        <xs:element name="heading" type="xs:string"/>
        <xs:element name="body" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<note>
  <to>Tove</to>
  <from>Jani</from>
  <heading>Reminder</heading>
  <body>Hello from USS XSD Studio</body>
</note>`;

export function createStudioState() {
  return {
    editors: {
      xsd: null,
      xml: null
    },
    models: {
      xsd: null,
      xml: null
    },
    files: {
      xsdName: "schema.xsd",
      xmlName: "sample.xml"
    },
    content: {
      xsd: DEFAULT_XSD,
      xml: DEFAULT_XML
    },
    externalDocuments: {},
    validation: {
      diagnostics: [],
      errors: [],
      warnings: []
    },
    ui: {
      activeTab: "results",
      wordWrap: "on",
      autoValidate: false
    }
  };
}