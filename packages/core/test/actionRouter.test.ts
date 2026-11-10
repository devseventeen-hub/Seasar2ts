import { describe, it, expect } from "vitest";
import { S2HierarchicalContainer } from "../src/container/hierarchicalContainer";
import { S2HttpRouter, createHttpHandler, inferActionBasePath } from "../src/web/router";
import { view, redirect, json, ActionResult } from "../src/web/actionResult";

class UserForm {
  name?: string;
  email?: string;
}

class UserAction {
  public userForm = new UserForm();
  public searchKeyword = "";

  async index(): Promise<ActionResult> {
    return view("userList.jsp", { title: "User List" });
  }

  async submit(form?: UserForm): Promise<ActionResult> {
    const targetName = form?.name || this.userForm.name;
    if (!targetName) {
      return json({ error: "name is required" }, 400);
    }
    return redirect("/user/index");
  }

  async legacyView(): Promise<string> {
    return "userDetail.jsp";
  }

  async legacyRedirect(): Promise<string> {
    return "user/index?redirect=true";
  }

  async apiData(): Promise<any> {
    return { id: 100, name: "Taro" };
  }
}

describe("S2HttpRouter & ActionResult (Phase 1)", () => {
  it("should infer basePath according to Seasar2 conventions", () => {
    expect(inferActionBasePath("UserAction")).toBe("/user");
    expect(inferActionBasePath("ItemCategoryAction")).toBe("/itemCategory");
    expect(inferActionBasePath("OrderController")).toBe("/order");
  });

  it("should register routes from Action class and dispatch requests with parameter binding", async () => {
    const container = new S2HierarchicalContainer("root");
    container.bind("userAction").to(UserAction).inSingletonScope();

    const router = new S2HttpRouter(container);
    router.registerAction("userAction", UserAction);

    const routes = router.getRoutes();
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.some(r => r.path === "/user" && r.methodName === "index")).toBe(true);
    expect(routes.some(r => r.path === "/user/submit" && r.methodName === "submit")).toBe(true);

    // 1. GET /user -> index() view
    const indexRes = await router.handleRequest({
      method: "GET",
      path: "/user"
    });
    expect(indexRes.status).toBe(200);
    expect(indexRes.actionResult?.type).toBe("view");
    expect(indexRes.actionResult?.path).toBe("userList.jsp");
    expect(indexRes.body).toEqual({ title: "User List" });

    // 2. POST /user/submit with parameters bound to form
    const submitRes = await router.handleRequest({
      method: "POST",
      path: "/user/submit",
      body: { name: "Tanaka", email: "tanaka@example.com" }
    });
    expect(submitRes.status).toBe(302);
    expect(submitRes.actionResult?.type).toBe("redirect");
    expect(submitRes.headers.location).toBe("/user/index");

    // 3. Validation error branch (empty name)
    const emptySubmitRes = await router.handleRequest({
      method: "POST",
      path: "/user/submit",
      body: { name: "", email: "foo@example.com" }
    });
    expect(emptySubmitRes.status).toBe(400);
    expect(emptySubmitRes.body).toEqual({ error: "name is required" });

    // 4. Legacy SA-Struts string return (view)
    const legViewRes = await router.handleRequest({
      method: "GET",
      path: "/user/legacyView"
    });
    expect(legViewRes.status).toBe(200);
    expect(legViewRes.actionResult?.type).toBe("view");
    expect(legViewRes.actionResult?.path).toBe("userDetail.jsp");

    // 5. Legacy SA-Struts string return (redirect)
    const legRedirRes = await router.handleRequest({
      method: "GET",
      path: "/user/legacyRedirect"
    });
    expect(legRedirRes.status).toBe(302);
    expect(legRedirRes.actionResult?.type).toBe("redirect");
    expect(legRedirRes.headers.location).toBe("/user/index");

    // 6. Direct object return (auto-json)
    const apiRes = await router.handleRequest({
      method: "GET",
      path: "/user/apiData"
    });
    expect(apiRes.status).toBe(200);
    expect(apiRes.body).toEqual({ id: 100, name: "Taro" });

    // 7. Not found
    const notFoundRes = await router.handleRequest({
      method: "GET",
      path: "/user/nonExistentMethod"
    });
    expect(notFoundRes.status).toBe(404);
  });

  it("should adapt to standard Node.js HTTP handler with createHttpHandler", async () => {
    const container = new S2HierarchicalContainer("root");
    container.bind("userAction").to(UserAction).inSingletonScope();

    const router = new S2HttpRouter(container);
    router.registerAction("userAction", UserAction);

    const handler = createHttpHandler(router);

    // Mock Node.js req and res
    const req: any = {
      method: "GET",
      url: "/user/apiData",
      headers: {}
    };

    let statusCode = 0;
    const headers: Record<string, string> = {};
    let endBody = "";

    const res: any = {
      set statusCode(val: number) {
        statusCode = val;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      end(chunk?: any) {
        endBody = chunk;
      }
    };

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(headers["content-type"]).toContain("application/json");
    expect(JSON.parse(endBody)).toEqual({ id: 100, name: "Taro" });
  });
});
