import type { ServiceItemProps } from "../types/Metrics";

const ServiceItem = ({ name, status }: ServiceItemProps) => (
    <div className="service flexbox">
        <span className="service-name">{name}</span>
        <span className={`service-status ${status.toLowerCase()}`}>{status}</span>
    </div>
);

export default ServiceItem;