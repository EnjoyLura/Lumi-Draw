import { IMG, modelName, userName } from "../data/mock";
import { getWork } from "../data/service";
import { useNav } from "../shell/NavContext";
import { Sec, StatusBadge } from "../ui";
import { RejectForm } from "./Review";

export function ReviewDetail({ param }: { param?: string }) {
  const { back, openSheet, toast } = useNav();
  const w = getWork(Number(param ?? 0));

  const approve = () => { w.status = "已发布"; back(); toast("已通过审核"); };
  const reject = () => openSheet("拒绝原因", <RejectForm work={w} onAfter={back} />);

  return (
    <>
      <img className="thumb" src={IMG("w" + w.id)} style={{ width: "100%", aspectRatio: "1", borderRadius: 14 }} alt="" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 2px 8px" }}>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{w.title || "未命名作品"}</div>
        <StatusBadge s={w.status} />
      </div>

      <Sec title="标题与描述" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k">作品标题</span><span className="v">{w.title || "未命名作品"}</span></div>
        <div style={{ padding: "11px 0", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>{w.desc || "（暂无作品描述）"}</div>
      </div>

      <Sec title="作品信息" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k">作者</span><span className="v">{userName(w.userId)}</span></div>
        <div className="kv"><span className="k">模型 / 分辨率</span><span className="v">{modelName(w.model)} · {w.quality}</span></div>
        <div className="kv"><span className="k">风格 / 比例</span><span className="v">{w.style} · {w.ratio}</span></div>
        <div className="kv"><span className="k">提交时间</span><span className="v">{w.time}</span></div>
      </div>

      <Sec title="提示词" />
      <div className="card" style={{ padding: "12px 14px", fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>{w.prompt}</div>

      {w.status === "待审核" ? (
        <div className="actionbar">
          <button className="btn btn-danger btn-block" onClick={reject}>拒绝</button>
          <button className="btn btn-success btn-block" onClick={approve}><i className="ri-check-line" />通过</button>
        </div>
      ) : null}
    </>
  );
}
