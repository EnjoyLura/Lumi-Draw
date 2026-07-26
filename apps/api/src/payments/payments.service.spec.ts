import assert from "node:assert/strict";
import test from "node:test";
import { PaymentsService } from "./payments.service";

type CustomRechargeSpecAccessor = {
  customRechargeSpec(amount: number | undefined): {
    amountFen: number;
    credits: number;
    bonusCredits: number;
    subject: string;
    body: string;
  };
};

function createService() {
  return new PaymentsService(
    {} as never,
    {} as never,
    { get: () => "test" } as never,
    {} as never
  ) as unknown as CustomRechargeSpecAccessor;
}

test("custom recharge uses 100 credits per yuan with a one-yuan minimum", () => {
  const service = createService();

  assert.throws(() => service.customRechargeSpec(0.99), /充值金额不能低于1元/);
  assert.deepEqual(service.customRechargeSpec(1), {
    amountFen: 100,
    credits: 100,
    bonusCredits: 5,
    subject: "自定义充值 105积分",
    body: "购买100积分，赠送5积分"
  });
  assert.deepEqual(service.customRechargeSpec(1.23), {
    amountFen: 123,
    credits: 123,
    bonusCredits: 6,
    subject: "自定义充值 129积分",
    body: "购买123积分，赠送6积分"
  });
});
