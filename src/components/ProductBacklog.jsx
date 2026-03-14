import Storypoint from "./Storypoint";
import "./ProductBacklog.css";
import "./Storypoint.css";

function ProductBacklog() {
  const storypoints = [
    {
      id: 1,
      name: "User Login",
      description: "As a user, I want to log in securely so that I can access my account.",
      tests: [
        "Login succeeds with valid credentials",
        "Login fails with invalid password",
        "User sees an error message on failure",
      ],
      priority: "High",
      businessValue: 100,
      comment: "",
      realised: true,
      assigned: true,
    },
    {
      id: 2,
      name: "User Registration",
      description: "As a new user, I want to create an account so that I can use the platform.",
      tests: [
        "Registration succeeds with valid data",
        "Duplicate email is rejected",
        "Password rules are validated",
      ],
      priority: "High",
      businessValue: 90,
      comment: "",
      realised: false,
      assigned: true,
    },
    {
      id: 3,
      name: "Profile Editing",
      description: "As a user, I want to edit my profile so that my information stays up to date.",
      tests: [
        "Profile changes are saved",
        "Invalid input is rejected",
        "Updated data is visible after refresh",
      ],
      priority: "Medium",
      businessValue: 70,
      comment: "",
      realised: false,
      assigned: false,
    },
    {
      id: 4,
      name: "Password Reset",
      description: "As a user, I want to reset my password so that I can recover my account.",
      tests: [
        "Reset email is sent",
        "Token expires correctly",
        "New password can be set successfully",
      ],
      priority: "Medium",
      businessValue: 80,
      comment: "",
      realised: true,
      assigned: true,
    },
    {
      id: 5,
      name: "Dark Mode",
      description: "As a user, I want a dark mode option so that I can use the app comfortably at night.",
      tests: [
        "Theme switches correctly",
        "Preference persists after reload",
        "All pages respect theme colors",
      ],
      priority: "Low",
      businessValue: 50,
      comment: "",
      realised: false,
      assigned: false,
    },
  ];

  const realisedStorypoints = storypoints.filter((storypoint) => storypoint.realised);
  const notRealisedAssigned = storypoints.filter(
    (storypoint) => !storypoint.realised && storypoint.assigned
  );
  const notRealisedUnassigned = storypoints.filter(
    (storypoint) => !storypoint.realised && !storypoint.assigned
  );

  const renderStorypoints = (items) => {
    if (items.length === 0) {
      return <p className="empty-state">No storypoints in this category.</p>;
    }

    return (
      <div className="storypoint-grid">
        {items.map((storypoint) => (
          <Storypoint key={storypoint.id} storypoint={storypoint} />
        ))}
      </div>
    );
  };

  return (
    <main className="product-backlog">
      <h1>Product Backlog</h1>

      <section className="backlog-section">
        <h2>Realised</h2>
        {renderStorypoints(realisedStorypoints)}
      </section>

      <section className="backlog-section">
        <h2>Not Realised</h2>

        <div className="nested-section">
          <h3>Assigned</h3>
          {renderStorypoints(notRealisedAssigned)}
        </div>

        <div className="nested-section">
          <h3>Unassigned</h3>
          {renderStorypoints(notRealisedUnassigned)}
        </div>
      </section>
    </main>
  );
}

export default ProductBacklog;