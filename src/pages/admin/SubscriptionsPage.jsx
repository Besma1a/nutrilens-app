import { useState } from "react";
import { T, css, StatusBadge, PageHead, Drawer, Select, EmptyState, FormInput, SuccessMsg } from "./adminUtils";

let _planIdCounter = 3;
const PLANS_DATA = [
  {
    id: 1,
    name: "Basic",
    price: 29,
    subs: 145,
    description: "Perfect for getting started",
    features: {
      Core: ["1 Consultation/month", "Basic Meal Plans", "Food Logging", "Progress Tracking"],
      Support: ["Email Support"],
      Extras: [],
    },
  },
  {
    id: 2,
    name: "Premium",
    price: 59,
    subs: 280,
    featured: true,
    description: "Most popular for serious results",
    features: {
      Core: ["4 Consultations/month", "Custom Meal Plans", "Recipe Library", "Progress Tracking", "Macro Tracking"],
      Support: ["Priority Email", "24h Response"],
      Extras: ["Progress Analytics", "AI Food Scanner"],
    },
  },
  {
    id: 3,
    name: "VIP",
    price: 99,
    subs: 95,
    description: "White-glove premium experience",
    features: {
      Core: ["Unlimited Consultations", "Personalized Programs", "Priority Scheduling", "Dedicated Nutritionist"],
      Support: ["24/7 Support", "Dedicated Nutritionist", "Phone Support"],
      Extras: ["All Premium Features", "Custom Integrations", "Monthly Check-ins"],
    },
  },
];

const PROMOS_INIT = [
  { id: 1, label: "Summer Sale", desc: "20% off all plans", discount: "20%", active: true, startDate: "Jul 1", endDate: "Aug 31" },
  { id: 2, label: "New Year", desc: "Free first month", discount: "100%", active: false, startDate: "Jan 1", endDate: "Jan 14" },
  { id: 3, label: "Referral", desc: "$10 credit per referral", discount: "$10", active: true, startDate: "Always", endDate: "Always" },
];

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState(PLANS_DATA);
  const [promos, setPromos] = useState(PROMOS_INIT);
  const [editPlan, setEditPlan] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", price: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({ name: "", price: "49", desc: "", core: "", support: "", extras: "" });
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({ label: "", desc: "", discount: "", startDate: "", endDate: "" });
  const [successMsg, setSuccessMsg] = useState("");

  const toggle = (id) => {
    setPromos(p => p.map(x => x.id === id ? { ...x, active: !x.active } : x));
    setSuccessMsg("Promo updated");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const removePromo = (id) => {
    setPromos(p => p.filter(x => x.id !== id));
    setSuccessMsg("Promo deleted");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const createPlan = () => {
    _planIdCounter += 1;
    const fresh = {
      id: _planIdCounter,
      name: newPlanForm.name.trim() || `Custom ${plans.length + 1}`,
      price: Math.max(0, Number(newPlanForm.price) || 0),
      subs: 0,
      description: newPlanForm.desc.trim() || "Custom plan",
      features: {
        Core: newPlanForm.core.split(",").map(s => s.trim()).filter(Boolean),
        Support: newPlanForm.support.split(",").map(s => s.trim()).filter(Boolean),
        Extras: newPlanForm.extras.split(",").map(s => s.trim()).filter(Boolean),
      },
    };
    setPlans(prev => [...prev, fresh]);
    setCreateOpen(false);
    setNewPlanForm({ name: "", price: "49", desc: "", core: "", support: "", extras: "" });
    setSuccessMsg("Plan created");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const openEdit = (plan) => {
    setEditPlan(plan);
    setEditForm({ name: plan.name, price: String(plan.price) });
  };

  const savePlan = () => {
    if (!editPlan) return;
    const nextPrice = Math.max(0, Number(editForm.price) || 0);
    setPlans(prev => prev.map(p => p.id === editPlan.id ? { ...p, name: editForm.name.trim() || p.name, price: nextPrice } : p));
    setEditPlan(null);
    setSuccessMsg("Plan updated");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const deletePlan = (id) => {
    setPlans(prev => prev.filter(p => p.id !== id));
    setEditPlan(prev => (prev?.id === id ? null : prev));
    setSuccessMsg("Plan deleted");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const addPromo = () => {
    const id = promos.length ? Math.max(...promos.map(p => p.id)) + 1 : 1;
    setPromos(prev => [
      ...prev,
      {
        id,
        label: promoForm.label.trim() || `Promo ${id}`,
        desc: promoForm.desc.trim() || "Special offer",
        discount: promoForm.discount.trim() || "10%",
        active: true,
        startDate: promoForm.startDate || "Today",
        endDate: promoForm.endDate || "TBD",
      },
    ]);
    setPromoOpen(false);
    setPromoForm({ label: "", desc: "", discount: "", startDate: "", endDate: "" });
    setSuccessMsg("Promo created");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  return (
    <>
      <PageHead title="Subscription Plans & Promotions" sub="Manage pricing, features, and promotional campaigns." />
      <SuccessMsg message={successMsg} show={!!successMsg} />

      {/* STATS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Total Subscribers", value: plans.reduce((s, p) => s + p.subs, 0) },
          { label: "Active Promos", value: promos.filter(p => p.active).length },
          { label: "Avg Price", value: `$${Math.round(plans.reduce((s, p) => s + p.price, 0) / plans.length)}` },
          { label: "Plans Available", value: plans.length,  },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              background: T.white,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 32 }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: T.gray, fontWeight: 600, marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* PLANS SECTION */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>
              Pricing Plans
            </h3>
            <p style={{ fontSize: 13, color: T.gray, margin: 0 }}>
              {plans.length} active plans • {plans.reduce((s, p) => s + p.subs, 0)} total subscribers
            </p>
          </div>
          <button style={css.btn(T.green, "#fff")} onClick={() => setCreateOpen(true)}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Plan
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18 }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              style={{
                ...css.cardPad,
                border: plan.featured ? `2px solid ${T.green}` : `1px solid ${T.border}`,
                position: "relative",
              }}
            >
              {plan.featured && (
                <div
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: T.green,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 14px",
                    borderRadius: 20,
                    whiteSpace: "nowrap",
                  }}
                >
                  Most Popular
                </div>
              )}
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 2 }}>{plan.name}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: T.text, marginBottom: 2 }}>
                ${plan.price}<span style={{ fontSize: 13, fontWeight: 400, color: T.gray }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: T.gray, marginBottom: 14 }}>{plan.subs} subscribers</div>

              {Object.entries(plan.features).map(([group, feats]) =>
                feats.length > 0 && (
                  <div key={group} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.gray,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      {group}
                    </div>
                    {feats.map(f => (
                      <div
                        key={f}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          fontSize: 12,
                          color: T.textMd,
                          padding: "2px 0",
                        }}
                      >
                        <span style={{ color: T.greenTx, fontWeight: 700, fontSize: 13 }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                )
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  style={{
                    ...css.btn(
                      plan.featured ? T.green : T.white,
                      plan.featured ? "#fff" : T.text,
                      plan.featured ? "none" : `1px solid ${T.border}`
                    ),
                    flex: 1,
                    justifyContent: "center",
                  }}
                  onClick={() => openEdit(plan)}
                >
                  Edit Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROMOTIONS SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20 }}>
        <div style={css.cardPad}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0, marginBottom: 4 }}>
                Active Promotions
              </h3>
              <p style={{ fontSize: 13, color: T.gray, margin: 0 }}>
                {promos.filter(p => p.active).length} active • {promos.length} total
              </p>
            </div>
            <button style={css.btn(T.green, "#fff")} onClick={() => setPromoOpen(true)}>
              + New Promo
            </button>
          </div>

          {promos.length === 0 ? (
            <EmptyState title="No promotions" message="Create your first promotion to attract customers" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {promos.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: p.active ? T.greenBg : T.grayLt,
                    border: `1px solid ${p.active ? T.greenLight : T.border}`,
                    borderRadius: 10,
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 12, color: T.gray, marginBottom: 6 }}>
                      {p.desc}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.gray }}>
                      <span>📅 {p.startDate} - {p.endDate}</span>
                      <span style={{ fontWeight: 600, color: T.green }}>💰 {p.discount}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button style={css.btn(T.redLt, T.redTx)} onClick={() => removePromo(p.id)}>
                      Delete
                    </button>
                    <div
                      onClick={() => toggle(p.id)}
                      style={{
                        position: "relative",
                        width: 44,
                        height: 24,
                        borderRadius: 24,
                        background: p.active ? T.green : "#d1d5db",
                        cursor: "pointer",
                        transition: "all 0.3s",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 2,
                          left: p.active ? 22 : 2,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 0.3s",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PROMO IMPACT STATS */}
        <div style={css.cardPad}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0, marginBottom: 20 }}>
            Promotion Impact
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Conversions", value: "34%", change: "↑ 12% vs last month" },
              { label: "Avg Order Value", value: "$62", change: "↑ 8% vs last month" },
              { label: "Customer Lifetime Value", value: "$324", change: "↑ 15% vs last month" },
              { label: "Promo Revenue", value: "$8,420", change: "↑ 22% vs last month" },
            ].map((stat, i) => (
              <div key={i} style={{ paddingBottom: 16, borderBottom: i < 3 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ fontSize: 12, color: T.gray, fontWeight: 600, marginBottom: 6 }}>
                  {stat.label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
                    {stat.value}
                  </span>
                  <span style={{ fontSize: 12, color: T.greenTx, fontWeight: 600 }}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Plan Drawer */}
      <Drawer open={!!editPlan} onClose={() => setEditPlan(null)} title={`Edit ${editPlan?.name} Plan`}>
        {editPlan && (
          <>
            <FormInput
              label="Plan Name"
              value={editForm.name}
              onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <FormInput
              label="Price ($/month)"
              type="number"
              value={editForm.price}
              onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))}
              required
            />

            <div style={{ marginBottom: 20, padding: 16, background: T.grayLt, borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.gray, marginBottom: 10 }}>
                📊 Current Plan Stats
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: T.gray }}>Subscribers</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>
                    {editPlan.subs}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: T.gray }}>Monthly Revenue</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>
                    ${editPlan.subs * editForm.price}
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: "20px 0 12px" }}>
              Features
            </h4>
            {Object.entries(editPlan.features).map(([group, feats]) => (
              <div key={group} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.gray, textTransform: "uppercase", marginBottom: 8 }}>
                  {group}
                </div>
                {feats.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <input type="checkbox" defaultChecked style={{ cursor: "pointer" }} />
                    <span style={{ fontSize: 13, color: T.text }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button style={css.btn(T.green, "#fff")} onClick={savePlan}>
                Save Changes
              </button>
              <button style={css.btn(T.redLt, T.redTx)} onClick={() => deletePlan(editPlan.id)}>
                Delete Plan
              </button>
            </div>
          </>
        )}
      </Drawer>

      {/* Create Plan Drawer */}
      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Plan">
        <FormInput
          label="Plan Name"
          value={newPlanForm.name}
          onChange={e => setNewPlanForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g., Gold, Platinum"
          required
        />
        <FormInput
          label="Description"
          value={newPlanForm.desc}
          onChange={e => setNewPlanForm(p => ({ ...p, desc: e.target.value }))}
          placeholder="e.g., Best for serious health enthusiasts"
        />
        <FormInput
          label="Price ($/month)"
          type="number"
          value={newPlanForm.price}
          onChange={e => setNewPlanForm(p => ({ ...p, price: e.target.value }))}
          required
        />
        <FormInput
          label="Core Features (comma separated)"
          value={newPlanForm.core}
          onChange={e => setNewPlanForm(p => ({ ...p, core: e.target.value }))}
          placeholder="e.g., 2 Consultations, Meal Plans"
        />
        <FormInput
          label="Support Features (comma separated)"
          value={newPlanForm.support}
          onChange={e => setNewPlanForm(p => ({ ...p, support: e.target.value }))}
          placeholder="e.g., Email Support, Chat"
        />
        <FormInput
          label="Extra Features (comma separated)"
          value={newPlanForm.extras}
          onChange={e => setNewPlanForm(p => ({ ...p, extras: e.target.value }))}
          placeholder="e.g., Analytics, AI Scanner"
        />
        <button style={css.btn(T.green, "#fff")} onClick={createPlan}>
          Create Plan
        </button>
      </Drawer>

      {/* Create Promo Drawer */}
      <Drawer open={promoOpen} onClose={() => setPromoOpen(false)} title="Create Promotion">
        <FormInput
          label="Promo Name"
          value={promoForm.label}
          onChange={e => setPromoForm(p => ({ ...p, label: e.target.value }))}
          placeholder="e.g., Summer Sale"
          required
        />
        <FormInput
          label="Description"
          value={promoForm.desc}
          onChange={e => setPromoForm(p => ({ ...p, desc: e.target.value }))}
          placeholder="e.g., 20% off all plans"
          required
        />
        <FormInput
          label="Discount"
          value={promoForm.discount}
          onChange={e => setPromoForm(p => ({ ...p, discount: e.target.value }))}
          placeholder="e.g., 20% or $10"
          required
        />
        <FormInput
          label="Start Date"
          type="date"
          value={promoForm.startDate}
          onChange={e => setPromoForm(p => ({ ...p, startDate: e.target.value }))}
        />
        <FormInput
          label="End Date"
          type="date"
          value={promoForm.endDate}
          onChange={e => setPromoForm(p => ({ ...p, endDate: e.target.value }))}
        />
        <button style={css.btn(T.green, "#fff")} onClick={addPromo}>
          Create Promo
        </button>
      </Drawer>
    </>
  );
}