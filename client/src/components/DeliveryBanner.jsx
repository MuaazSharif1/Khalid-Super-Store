import React from "react";

export default function DeliveryBanner() {
  return (
    <section className="delivery-banner">
      <div className="container delivery-banner-inner">
        <span className="delivery-seal"><img src="./khalid_logo.png" alt="" /></span>
        <div>
          <strong>Home delivery within 5–6 km</strong>
          <span>Currently serving Mozang and surrounding neighbourhoods.</span>
        </div>
      </div>
    </section>
  );
}
