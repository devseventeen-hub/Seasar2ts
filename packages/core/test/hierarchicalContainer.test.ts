import { describe, it, expect } from "vitest";
import { S2HierarchicalContainer } from "../src/container/hierarchicalContainer";
import { injectable } from "inversify";

@injectable()
class CommonDao {
  getData() {
    return "common data from root";
  }
}

@injectable()
class WebAction {
  getAction() {
    return "web action executed";
  }
}

@injectable()
class BatchTask {
  runTask() {
    return "batch task executed";
  }
}

describe("S2HierarchicalContainer (Nested Container Tree)", () => {
  it("child container should resolve components registered in root container", () => {
    const root = new S2HierarchicalContainer("root");
    root.bind("CommonDao").to(CommonDao);

    const webChild = root.createChild("web");
    webChild.bind("WebAction").to(WebAction);

    // 子コンテナから親の CommonDao が取得できること
    expect(webChild.isBound("CommonDao")).toBe(true);
    const resolvedDao = webChild.get<CommonDao>("CommonDao");
    expect(resolvedDao.getData()).toBe("common data from root");

    // 親コンテナからは子の WebAction が見えないこと (カプセル化)
    expect(root.isBound("WebAction")).toBe(false);
  });

  it("sibling child containers should be isolated from each other", () => {
    const root = new S2HierarchicalContainer("root");
    const webChild = root.createChild("web");
    const batchChild = root.createChild("batch");

    webChild.bind("WebAction").to(WebAction);
    batchChild.bind("BatchTask").to(BatchTask);

    expect(webChild.isBound("WebAction")).toBe(true);
    expect(webChild.isBound("BatchTask")).toBe(false);

    expect(batchChild.isBound("BatchTask")).toBe(true);
    expect(batchChild.isBound("WebAction")).toBe(false);
  });

  it("child container should be able to override root binding without affecting root", () => {
    const root = new S2HierarchicalContainer("root");

    @injectable()
    class RootService {
      name = "root";
    }

    @injectable()
    class CustomService {
      name = "custom";
    }

    root.bind("Service").to(RootService);

    const child = root.createChild("child");
    child.bind("Service").to(CustomService);

    expect(root.get<any>("Service").name).toBe("root");
    expect(child.get<any>("Service").name).toBe("custom");
  });
});
