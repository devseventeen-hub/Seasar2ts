import { describe, it, expect } from "vitest";
import { parseDiconContent } from "../src/dicon/diconParser";

describe("dicon XML Parser", () => {
  it("should parse components, aspects, and includes from dicon xml", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE components PUBLIC "-//SEASAR//DTD S2Container//EN"
      "http://www.seasar.org/dtd/components.dtd">
    <components>
      <include path="dao.dicon"/>
      <component name="tx" class="org.seasar.extension.tx.RequiredInterceptor"/>
      <component name="userDao" class="com.example.dao.UserDao">
        <aspect>tx</aspect>
      </component>
    </components>`;

    const dicon = parseDiconContent(xml);
    expect(dicon.includes.length).toBe(1);
    expect(dicon.includes[0].path).toBe("dao.dicon");

    expect(dicon.components.length).toBe(2);
    expect(dicon.components[0].name).toBe("tx");
    expect(dicon.components[0].className).toBe("org.seasar.extension.tx.RequiredInterceptor");

    expect(dicon.components[1].name).toBe("userDao");
    expect(dicon.components[1].className).toBe("com.example.dao.UserDao");
    expect(dicon.components[1].aspects).toContain("tx");
  });
});
