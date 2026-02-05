-- Create enum for user verification levels
CREATE TYPE public.user_verification_level AS ENUM ('unverified', 'verified', 'anonymous');

-- Create enum for verification methods
CREATE TYPE public.verification_method AS ENUM ('none', 'digilocker', 'voter_id', 'municipal_id', 'admin_verified');

-- Create user_verification table (separate from profiles for security)
CREATE TABLE public.user_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  verification_level user_verification_level NOT NULL DEFAULT 'unverified',
  verification_method verification_method NOT NULL DEFAULT 'none',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID, -- Admin who verified (for manual verification)
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  trust_score INTEGER NOT NULL DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  valid_reports_count INTEGER NOT NULL DEFAULT 0,
  rejected_reports_count INTEGER NOT NULL DEFAULT 0,
  verification_metadata JSONB, -- Stores non-sensitive verification info
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_verification ENABLE ROW LEVEL SECURITY;

-- Create legal rules table
CREATE TABLE public.legal_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  act_name TEXT NOT NULL,
  section_clause TEXT,
  responsible_authority TEXT NOT NULL,
  sla_days INTEGER, -- Legal deadline in days if defined by law
  description TEXT,
  state TEXT, -- For state-specific rules
  city TEXT, -- For city-specific rules
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.legal_rules ENABLE ROW LEVEL SECURITY;

-- Create issue legal mapping junction table
CREATE TABLE public.issue_legal_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  legal_rule_id UUID NOT NULL REFERENCES public.legal_rules(id) ON DELETE CASCADE,
  auto_mapped BOOLEAN NOT NULL DEFAULT true,
  mapped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mapped_by UUID,
  UNIQUE(issue_id, legal_rule_id)
);

-- Enable RLS
ALTER TABLE public.issue_legal_mappings ENABLE ROW LEVEL SECURITY;

-- Create audit log table for compliance
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  justification TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add columns to issues table for anonymous reporting and priority
ALTER TABLE public.issues 
ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN verification_level_at_creation user_verification_level DEFAULT 'unverified',
ADD COLUMN trust_score_at_creation INTEGER DEFAULT 50,
ADD COLUMN priority_score INTEGER DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
ADD COLUMN legal_compliance_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN compliance_status TEXT DEFAULT 'on_track';

-- RLS Policies for user_verification
CREATE POLICY "Users can view their own verification" ON public.user_verification
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification consent" ON public.user_verification
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications" ON public.user_verification
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update verifications" ON public.user_verification
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "System can insert verifications" ON public.user_verification
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

-- RLS Policies for legal_rules
CREATE POLICY "Anyone authenticated can view active legal rules" ON public.legal_rules
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Super admins can manage legal rules" ON public.legal_rules
  FOR ALL USING (is_super_admin(auth.uid()));

-- RLS Policies for issue_legal_mappings
CREATE POLICY "Authenticated users can view legal mappings" ON public.issue_legal_mappings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage legal mappings" ON public.issue_legal_mappings
  FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for audit_logs
CREATE POLICY "Super admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION public.calculate_trust_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification user_verification%ROWTYPE;
  v_score INTEGER := 50;
BEGIN
  SELECT * INTO v_verification FROM user_verification WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 50;
  END IF;
  
  -- Base score from verification level
  CASE v_verification.verification_level
    WHEN 'verified' THEN v_score := 80;
    WHEN 'unverified' THEN v_score := 50;
    WHEN 'anonymous' THEN v_score := 20;
  END CASE;
  
  -- Add points for valid reports (max +15)
  v_score := v_score + LEAST(v_verification.valid_reports_count * 2, 15);
  
  -- Subtract points for rejected reports (max -30)
  v_score := v_score - LEAST(v_verification.rejected_reports_count * 5, 30);
  
  -- Ensure score is within bounds
  v_score := GREATEST(0, LEAST(100, v_score));
  
  -- Update stored trust score
  UPDATE user_verification SET trust_score = v_score, updated_at = now() WHERE user_id = p_user_id;
  
  RETURN v_score;
END;
$$;

-- Function to calculate issue priority score
CREATE OR REPLACE FUNCTION public.calculate_issue_priority(p_issue_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue issues%ROWTYPE;
  v_priority INTEGER := 50;
  v_similar_count INTEGER;
BEGIN
  SELECT * INTO v_issue FROM issues WHERE id = p_issue_id;
  
  IF NOT FOUND THEN
    RETURN 50;
  END IF;
  
  -- Base priority from trust score at creation
  v_priority := COALESCE(v_issue.trust_score_at_creation, 50);
  
  -- Anonymous reports get reduced priority
  IF v_issue.is_anonymous THEN
    v_priority := v_priority - 20;
  END IF;
  
  -- Check for similar reports in same location (increases priority)
  SELECT COUNT(*) INTO v_similar_count
  FROM issues
  WHERE id != p_issue_id
    AND category = v_issue.category
    AND district = v_issue.district
    AND area = v_issue.area
    AND created_at > now() - interval '7 days';
  
  -- Add priority for multiple reports in same area (max +20)
  v_priority := v_priority + LEAST(v_similar_count * 5, 20);
  
  -- Ensure priority is within bounds
  v_priority := GREATEST(0, LEAST(100, v_priority));
  
  RETURN v_priority;
END;
$$;

-- Trigger to auto-create user_verification record
CREATE OR REPLACE FUNCTION public.create_user_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_verification (user_id, verification_level)
  VALUES (NEW.id, 'unverified')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_verification
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_verification();

-- Trigger to set issue verification info on creation
CREATE OR REPLACE FUNCTION public.set_issue_verification_info()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification user_verification%ROWTYPE;
BEGIN
  -- Get user verification info
  SELECT * INTO v_verification FROM user_verification WHERE user_id = NEW.user_id;
  
  IF FOUND THEN
    NEW.verification_level_at_creation := v_verification.verification_level;
    NEW.trust_score_at_creation := v_verification.trust_score;
  ELSE
    NEW.verification_level_at_creation := 'unverified';
    NEW.trust_score_at_creation := 50;
  END IF;
  
  -- Calculate initial priority
  NEW.priority_score := NEW.trust_score_at_creation;
  IF NEW.is_anonymous THEN
    NEW.priority_score := NEW.priority_score - 20;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_issue_insert_set_verification
BEFORE INSERT ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.set_issue_verification_info();

-- Function to auto-map legal rules to issues
CREATE OR REPLACE FUNCTION public.auto_map_legal_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule legal_rules%ROWTYPE;
BEGIN
  -- Find matching legal rules for this category
  FOR v_rule IN 
    SELECT * FROM legal_rules 
    WHERE category = NEW.category 
    AND is_active = true
    AND (state IS NULL OR state = NEW.state)
  LOOP
    INSERT INTO issue_legal_mappings (issue_id, legal_rule_id, auto_mapped)
    VALUES (NEW.id, v_rule.id, true)
    ON CONFLICT (issue_id, legal_rule_id) DO NOTHING;
    
    -- Set legal compliance deadline if rule has SLA days
    IF v_rule.sla_days IS NOT NULL AND NEW.legal_compliance_deadline IS NULL THEN
      NEW.legal_compliance_deadline := NEW.created_at + (v_rule.sla_days || ' days')::interval;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_issue_insert_map_legal_rules
AFTER INSERT ON public.issues
FOR EACH ROW
EXECUTE FUNCTION public.auto_map_legal_rules();

-- Insert sample Indian legal rules
INSERT INTO public.legal_rules (category, act_name, section_clause, responsible_authority, sla_days, description) VALUES
-- Roads
('roads', 'Motor Vehicles Act, 1988', 'Section 198A', 'Roads Department / Municipal Corporation', 7, 'Liability of government for road maintenance and pothole repairs'),
('roads', 'Indian Highways Act, 1956', 'Section 4', 'National Highways Authority', 14, 'Maintenance responsibility for national highways'),
('roads', 'Municipal Corporation Act', 'Section 63', 'Municipal Corporation Works Dept', 5, 'Street repairs and road maintenance within city limits'),

-- Garbage / Sanitation
('garbage', 'Solid Waste Management Rules, 2016', 'Rule 15', 'Sanitation Department / Urban Local Body', 2, 'Collection and disposal of solid waste from residential areas'),
('garbage', 'Environment Protection Act, 1986', 'Section 7', 'State Pollution Control Board', 7, 'Prevention and control of environmental pollution'),
('garbage', 'Municipal Solid Wastes Rules, 2000', 'Rule 4', 'Municipal Authority', 1, 'Door-to-door collection of municipal solid waste'),

-- Water
('water', 'Water Prevention & Control of Pollution Act, 1974', 'Section 24', 'State Pollution Control Board', 3, 'Prevention of water pollution and contamination'),
('water', 'Jal Jeevan Mission Guidelines, 2019', 'Section 3.2', 'Public Health Engineering Dept', 5, 'Functional household tap connection complaints'),
('water', 'Municipal Corporation Act', 'Section 97', 'Water Supply Department', 2, 'Repair of water supply infrastructure'),

-- Electricity
('electricity', 'Electricity Act, 2003', 'Section 43', 'State Electricity Distribution Company', 2, 'Duty to supply electricity on request'),
('electricity', 'Electricity Act, 2003', 'Section 57', 'State Electricity Regulatory Commission', 7, 'Standards of performance for distribution licensees'),
('electricity', 'Consumer Protection Act, 2019', 'Section 2(7)', 'Consumer Forum', 30, 'Rights regarding essential services including electricity'),

-- Other / General
('other', 'Right to Information Act, 2005', 'Section 4', 'Public Information Officer', 30, 'Public disclosure of information'),
('other', 'Disaster Management Act, 2005', 'Section 35', 'District Disaster Management Authority', 1, 'Response to natural disasters and emergencies'),
('other', 'Municipal Corporation Act', 'General', 'Municipal Corporation', 15, 'General civic amenities and public services');

-- Create function to log audit entries
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_justification TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, old_value, new_value, justification)
  VALUES (auth.uid(), p_action_type, p_entity_type, p_entity_id, p_old_value, p_new_value, p_justification)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;