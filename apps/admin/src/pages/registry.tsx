import type { ReactNode } from "react";
import { Dashboard } from "./Dashboard";
import { DataDetail } from "./DataDetail";
import { Finance } from "./Finance";
import { FinCheckin } from "./FinCheckin";
import { FinInvite } from "./FinInvite";
import { FinMember } from "./FinMember";
import { FinRecharge } from "./FinRecharge";
import { FinTxn } from "./FinTxn";
import { Home } from "./Home";
import { Messages } from "./Messages";
import { MsgAnnounce } from "./MsgAnnounce";
import { MsgFeedback } from "./MsgFeedback";
import { MsgPush } from "./MsgPush";
import { Ops } from "./Ops";
import { OpsBanner } from "./OpsBanner";
import { OpsCategory } from "./OpsCategory";
import { OpsGameplay } from "./OpsGameplay";
import { OpsHotSearch } from "./OpsHotSearch";
import { OpsModel } from "./OpsModel";
import { OpsQuality } from "./OpsQuality";
import { OpsRatio } from "./OpsRatio";
import { OpsStyle } from "./OpsStyle";
import { OpsCreatorTitle } from "./OpsCreatorTitle";
import { Review } from "./Review";
import { ReviewDetail } from "./ReviewDetail";
import { SetAgreement } from "./SetAgreement";
import { SetAudit } from "./SetAudit";
import { SetBase } from "./SetBase";
import { SetSensitive } from "./SetSensitive";
import { SetVersion } from "./SetVersion";
import { Settings } from "./Settings";
import { Stub } from "./Stub";
import { UserDetail } from "./UserDetail";
import { Users } from "./Users";
import { WorkDetail } from "./WorkDetail";
import { Works } from "./Works";

const REAL_PAGES: Record<string, (param?: string) => ReactNode> = {
  home: () => <Home />,
  users: () => <Users />,
  userDetail: (param) => <UserDetail param={param} />,
  works: () => <Works />,
  workDetail: (param) => <WorkDetail param={param} />,
  review: (param) => <Review param={param} />,
  reviewDetail: (param) => <ReviewDetail param={param} />,
  dashboard: () => <Dashboard />,
  dataDetail: (param) => <DataDetail param={param} />,
  ops: () => <Ops />,
  opsBanner: () => <OpsBanner />,
  opsGameplay: () => <OpsGameplay />,
  opsStyle: () => <OpsStyle />,
  opsCategory: () => <OpsCategory />,
  opsHotSearch: () => <OpsHotSearch />,
  opsModel: () => <OpsModel />,
  opsQuality: () => <OpsQuality />,
  opsRatio: () => <OpsRatio />,
  opsCreatorTitle: () => <OpsCreatorTitle />,
  finance: () => <Finance />,
  finRecharge: () => <FinRecharge />,
  finMember: () => <FinMember />,
  finCheckin: () => <FinCheckin />,
  finInvite: () => <FinInvite />,
  finTxn: () => <FinTxn />,
  setBase: () => <SetBase />,
  settings: () => <Settings />,
  setAudit: () => <SetAudit />,
  setSensitive: () => <SetSensitive />,
  setVersion: () => <SetVersion />,
  setAgreement: () => <SetAgreement />,
  messages: () => <Messages />,
  msgAnnounce: () => <MsgAnnounce />,
  msgPush: () => <MsgPush />,
  msgFeedback: () => <MsgFeedback />
};

export function renderPage(id: string, param?: string): ReactNode {
  const page = REAL_PAGES[id];
  return page ? page(param) : <Stub id={id} />;
}
