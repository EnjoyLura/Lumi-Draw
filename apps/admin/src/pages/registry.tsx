import { Spin } from "antd";
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

type PageComponent = ComponentType<Record<string, never>>;
type ParamPageComponent = ComponentType<{ param?: string }>;

const Home = lazy(() => import("./Home").then((module) => ({ default: module.Home })));
const Dashboard = lazy(() => import("./Dashboard").then((module) => ({ default: module.Dashboard })));
const DataDetail = lazy(() => import("./DataDetail").then((module) => ({ default: module.DataDetail })));
const Users = lazy(() => import("./Users").then((module) => ({ default: module.Users })));
const UserDetail = lazy(() => import("./UserDetail").then((module) => ({ default: module.UserDetail })));
const Works = lazy(() => import("./Works").then((module) => ({ default: module.Works })));
const WorkDetail = lazy(() => import("./WorkDetail").then((module) => ({ default: module.WorkDetail })));
const Review = lazy(() => import("./Review").then((module) => ({ default: module.Review })));
const ReviewDetail = lazy(() => import("./ReviewDetail").then((module) => ({ default: module.ReviewDetail })));
const Ops = lazy(() => import("./Ops").then((module) => ({ default: module.Ops })));
const OpsBanner = lazy(() => import("./OpsBanner").then((module) => ({ default: module.OpsBanner })));
const OpsGameplay = lazy(() => import("./OpsGameplay").then((module) => ({ default: module.OpsGameplay })));
const OpsStyle = lazy(() => import("./OpsStyle").then((module) => ({ default: module.OpsStyle })));
const OpsCategory = lazy(() => import("./OpsCategory").then((module) => ({ default: module.OpsCategory })));
const OpsHotSearch = lazy(() => import("./OpsHotSearch").then((module) => ({ default: module.OpsHotSearch })));
const OpsModel = lazy(() => import("./OpsModel").then((module) => ({ default: module.OpsModel })));
const OpsApiProvider = lazy(() => import("./OpsApiProvider").then((module) => ({ default: module.OpsApiProvider })));
const OpsQuality = lazy(() => import("./OpsQuality").then((module) => ({ default: module.OpsQuality })));
const OpsRatio = lazy(() => import("./OpsRatio").then((module) => ({ default: module.OpsRatio })));
const OpsCreatorTitle = lazy(() => import("./OpsCreatorTitle").then((module) => ({ default: module.OpsCreatorTitle })));
const Finance = lazy(() => import("./Finance").then((module) => ({ default: module.Finance })));
const FinRecharge = lazy(() => import("./FinRecharge").then((module) => ({ default: module.FinRecharge })));
const FinMember = lazy(() => import("./FinMember").then((module) => ({ default: module.FinMember })));
const FinCheckin = lazy(() => import("./FinCheckin").then((module) => ({ default: module.FinCheckin })));
const FinInvite = lazy(() => import("./FinInvite").then((module) => ({ default: module.FinInvite })));
const FinTxn = lazy(() => import("./FinTxn").then((module) => ({ default: module.FinTxn })));
const SetBase = lazy(() => import("./SetBase").then((module) => ({ default: module.SetBase })));
const Messages = lazy(() => import("./Messages").then((module) => ({ default: module.Messages })));
const MsgAnnounce = lazy(() => import("./MsgAnnounce").then((module) => ({ default: module.MsgAnnounce })));
const MsgPush = lazy(() => import("./MsgPush").then((module) => ({ default: module.MsgPush })));
const MsgFeedback = lazy(() => import("./MsgFeedback").then((module) => ({ default: module.MsgFeedback })));
const Settings = lazy(() => import("./Settings").then((module) => ({ default: module.Settings })));
const SetAudit = lazy(() => import("./SetAudit").then((module) => ({ default: module.SetAudit })));
const SetSensitive = lazy(() => import("./SetSensitive").then((module) => ({ default: module.SetSensitive })));
const SetVersion = lazy(() => import("./SetVersion").then((module) => ({ default: module.SetVersion })));
const SetAgreement = lazy(() => import("./SetAgreement").then((module) => ({ default: module.SetAgreement })));
const Stub = lazy(() => import("./Stub").then((module) => ({ default: module.Stub })));

function standard(Component: PageComponent) {
  return () => <Component />;
}

function withParam(Component: ParamPageComponent) {
  return (param?: string) => <Component param={param} />;
}

const REAL_PAGES: Record<string, (param?: string) => ReactNode> = {
  home: standard(Home),
  dashboard: standard(Dashboard),
  dataDetail: withParam(DataDetail),
  users: standard(Users),
  userDetail: withParam(UserDetail),
  works: standard(Works),
  workDetail: withParam(WorkDetail),
  review: withParam(Review),
  reviewDetail: withParam(ReviewDetail),
  ops: standard(Ops),
  opsBanner: standard(OpsBanner),
  opsGameplay: standard(OpsGameplay),
  opsStyle: standard(OpsStyle),
  opsCategory: standard(OpsCategory),
  opsHotSearch: standard(OpsHotSearch),
  opsModel: standard(OpsModel),
  opsApiProvider: standard(OpsApiProvider),
  opsQuality: standard(OpsQuality),
  opsRatio: standard(OpsRatio),
  opsCreatorTitle: standard(OpsCreatorTitle),
  finance: standard(Finance),
  finRecharge: standard(FinRecharge),
  finMember: standard(FinMember),
  finCheckin: standard(FinCheckin),
  finInvite: standard(FinInvite),
  finTxn: standard(FinTxn),
  setBase: standard(SetBase),
  messages: standard(Messages),
  msgAnnounce: standard(MsgAnnounce),
  msgPush: standard(MsgPush),
  msgFeedback: standard(MsgFeedback),
  settings: standard(Settings),
  setAudit: standard(SetAudit),
  setSensitive: standard(SetSensitive),
  setVersion: standard(SetVersion),
  setAgreement: standard(SetAgreement)
};

export function renderPage(id: string, param?: string): ReactNode {
  const render = REAL_PAGES[id];
  return (
    <Suspense fallback={<div className="lumi-page-loading"><Spin size="large" tip="正在加载" /></div>}>
      {render ? render(param) : <Stub id={id} />}
    </Suspense>
  );
}
